import OpenAI from "openai";
import { getKiloClient } from "./llm-client";
import { buildEventResponseFormat, getCategorySlugs, getCitySlugs, EventExtractionResponse, SHARED_FIELD_GUIDELINES } from "../event-schema";

/**
 * Extracts events from HTML content using Kilo Gateway (MiniMax M3) with structured output
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
      model: "minimax/minimax-m3",
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

    let parsedResponse: EventExtractionResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Event Extractor] Failed to parse JSON response:", parseError);
      return {
        success: false,
        error: "Failed to parse JSON response from Kilo Gateway"
      };
    }

    // Validate the response structure
    if (!parsedResponse.events || !Array.isArray(parsedResponse.events)) {
      return {
        success: false,
        error: "Invalid response structure: missing events array"
      };
    }

    return {
      success: true,
      events: parsedResponse.events
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