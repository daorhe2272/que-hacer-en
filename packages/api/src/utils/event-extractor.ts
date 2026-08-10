import OpenAI from "openai";
import { getKiloClient } from "./llm-client";
import { buildEventResponseFormat, getCategorySlugs, getCitySlugs, ExtractedEvent, EventExtractionResponse, SHARED_FIELD_GUIDELINES } from "../event-schema";

/**
 * Coerces provider-specific JSON shapes into the canonical { events: [...] } form.
 *
 * Providers behind the OpenAI-compatible gateway interpret the strict json_schema
 * envelope differently:
 *   - MiniMax M3 wrapped events in the declared object: { "events": [...] }
 *   - DeepSeek V4 Flash 0731 returns the bare array: [ {...}, {...} ]
 *   - Some models emit {} when no events are found, or a single unwrapped event object.
 * Returns null when the parsed value is not any known shape (genuinely malformed).
 */
function normalizeExtractionResponse(parsed: unknown): EventExtractionResponse | null {
  if (Array.isArray(parsed)) {
    return { events: parsed as EventExtractionResponse["events"] }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null
  }

  const obj = parsed as Record<string, unknown>

  if (Array.isArray(obj.events)) {
    return { events: obj.events as EventExtractionResponse["events"] }
  }

  // Single unwrapped event object, identified by the presence of event fields.
  if (typeof obj.source_url === "string" && typeof obj.title === "string") {
    return { events: [obj as unknown as ExtractedEvent] }
  }

  // Empty object → the model found no events.
  if (Object.keys(obj).length === 0) {
    return { events: [] }
  }

  return null
}

/**
 * Extracts events from HTML content using Kilo Gateway (DeepSeek V4 Flash 0731) with structured output
 */
export async function extractEventsFromHtml(html: string, sourceUrl: string, cityName?: string): Promise<{
  success: boolean;
  events?: EventExtractionResponse["events"];
  error?: string;
}> {
  const currentYear = new Date().getFullYear();
  try {

    const kiloClient = getKiloClient();

    const [categorySlugs, citySlugs] = await Promise.all([getCategorySlugs(), getCitySlugs()]);

    // Create the prompt for extracting events.
    const prompt = `Extrae todos los eventos distintos del siguiente contenido HTML.
    La URL de origen es: ${sourceUrl}
    El año actual es ${currentYear}. Para eventos con fecha definida pero sin año especificado, asume que el año es ${currentYear}.
    ${cityName ? `Estos eventos probablemente se llevan a cabo en ${cityName}. Usa esto como contexto para determinar location, address y city_slug.` : ""}

    Para cada evento, completa los campos de la siguiente manera:
    - source_url: la URL de origen indicada arriba, sin modificar.
    - event_url: la URL de la página de detalle propia de este evento (p. ej. un enlace con más información sobre el mismo). Si no existe una página de detalle propia, usa el mismo valor que source_url.
${SHARED_FIELD_GUIDELINES}
    - category_slug: debe ser exactamente uno de estos valores: ${categorySlugs.map((slug) => `'${slug}'`).join(", ")}. Si ninguno encaja perfectamente, elige el más cercano — nunca inventes un valor fuera de esta lista.
    - city_slug: debe ser exactamente uno de estos valores: ${citySlugs.map((slug) => `'${slug}'`).join(", ")}. Si ninguno encaja perfectamente, elige el más cercano — nunca inventes un valor fuera de esta lista.
    - image_url: la URL de la imagen del evento, si se encuentra una (revisa etiquetas de imagen y su src/URL). Si no se encuentra ninguna, usa null.

    Contenido HTML:
    ${html}

    Extrae todos los eventos y devuélvelos en el formato JSON especificado. Si no se encuentra ningún evento, devuelve un arreglo vacío.`;


    // Generate content with structured output
    const completion = await kiloClient.chat.completions.create({
      model: "deepseek/deepseek-v4-flash-0731",
      messages: [{ role: "user", content: prompt }],
      response_format: buildEventResponseFormat(categorySlugs, citySlugs),
    });

    // Guard against malformed responses from Kilo Gateway (e.g. missing `choices`)
    if (!completion.choices || completion.choices.length === 0) {
      console.error("[Event Extractor] Kilo Gateway response missing choices:", JSON.stringify(completion));
      return {
        success: false,
        error: "Kilo Gateway returned a response with no choices"
      };
    }

    // Parse the response
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return {
        success: false,
        error: "No response received from Kilo Gateway"
      };
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Event Extractor] Failed to parse JSON response:", parseError);
      return {
        success: false,
        error: "Failed to parse JSON response from Kilo Gateway"
      };
    }

    const normalized = normalizeExtractionResponse(parsed)
    if (!normalized) {
      return {
        success: false,
        error: "Invalid response structure: missing events array"
      };
    }

    return {
      success: true,
      events: normalized.events
    };

  } catch (error) {
    console.error("[Event Extractor] Error extracting events:", error);

    // Handle different types of errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return {
          success: false,
          error: "Invalid or missing API key for Kilo Gateway"
        };
      }

      if (error.status === 429) {
        return {
          success: false,
          error: "API quota exceeded or rate limit reached"
        };
      }

      if (error.status === 408 || error.message.includes("timeout")) {
        return {
          success: false,
          error: "Request timeout when calling Kilo Gateway"
        };
      }

      return {
        success: false,
        error: `Error from Kilo Gateway: ${error.message}`
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: `Error from Kilo Gateway: ${error.message}`
      };
    }

    return {
      success: false,
      error: "Unknown error occurred while extracting events"
    };
  }
}