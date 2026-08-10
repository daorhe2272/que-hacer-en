import OpenAI from "openai"
import { getKiloClient } from "./llm-client"
import { ExtractedEvent, SHARED_FIELD_GUIDELINES } from "../event-schema"

export interface EnrichmentResult {
  success: boolean
  enrichedFields: Partial<Pick<ExtractedEvent, 'title' | 'description' | 'location' | 'address' | 'Price' | 'time' | 'image_url'>>
  dateTimeConfirmed: boolean
  confirmationReason: string
  error?: string
}

const enrichmentSchema = {
  type: "object",
  properties: {
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    Price: { type: ["number", "null"] },
    time: { type: ["string", "null"] },
    image_url: { type: ["string", "null"] },
    date_time_confirmed: { type: "boolean" },
    confirmation_reason: { type: "string" },
  },
  required: ["title", "description", "location", "address", "Price", "time", "image_url", "date_time_confirmed", "confirmation_reason"],
  additionalProperties: false,
}

const enrichmentResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "event_enrichment",
    schema: enrichmentSchema,
    strict: true,
  },
} as const

export async function enrichEventFromHtml(
  pageHtml: string,
  originalEvent: ExtractedEvent,
  eventUrl: string
): Promise<EnrichmentResult> {
  try {
    const kiloClient = getKiloClient()

    const prompt = `Eres un asistente que mejora datos de eventos. Se te proporciona:
1. Los datos originales extraídos de una página de internet o un documento con información de eventos.
2. El HTML (sin scripts, estilos, ni atributos no esenciales) de una página de internet con detalles del evento individual a mejorar.

Significado y formato de los campos:
${SHARED_FIELD_GUIDELINES}

Instrucciones:
- Para los campos title, description, location, address, Price: la información de la página de detalle tiene prioridad cuando el valor original es null, está vacío o es genérico (p. ej. una descripción generada automáticamente como "Evento en el Royal Center: X"). En ese caso, devuelve el valor concreto de la página de detalle. Si el valor original ya es específico y la página de detalle no aporta una mejora, devuelve null.
- Para time: si el evento de la página de detalle es el mismo evento, la hora de la página de detalle tiene prioridad. Devuelve en time la hora de inicio en formato HH:MM (24 horas) que muestra la página de detalle cuando: (a) la hora original es "08:00" o "00:00" (valores centinela que indican que la primera extracción no encontró una hora real) y la página muestra una hora real, o (b) la hora original es real y la página la confirma. Si la página de detalle no muestra una hora real, devuelve null.
- Para image_url: si el valor original es null y la página de detalle contiene una imagen del evento (revisa las etiquetas <img> y sus atributos src o srcset, o URLs de imagen en el contenido), devuelve la URL de esa imagen. Si el valor original ya es válido o la página de detalle no muestra ninguna imagen del evento, devuelve null.
- NO modifiques date, city_slug, category_slug — son campos estructurales.
- Verifica que el evento de la página de detalle sea el mismo evento que el original comparando los títulos. Los títulos no necesitan ser idénticos, pero deben referirse al mismo evento. Si no son el mismo evento, devuelve date_time_confirmed = false.
- Para date_time_confirmed: devuelve true si la fecha de la página de detalle coincide con la fecha original (${originalEvent.date}) Y se cumple una de estas dos condiciones: la hora de la página de detalle coincide con la hora original (${originalEvent.time}), o la hora original es un valor centinela ("08:00" o "00:00") y la página de detalle muestra una hora real (esa hora se devuelve en time). Devuelve false si las fechas difieren, los títulos no se refieren al mismo evento, o la página no tiene info de fecha/hora.
- Para confirmation_reason: explica brevemente en español POR QUÉ estableciste date_time_confirmed en true o false. Indica si los títulos se refieren al mismo evento. Cita textualmente la fecha y hora que encontraste en la página de detalle (o indica "no se encontró fecha/hora en la página") y compárala con los datos originales. Si la hora original era un valor centinela (08:00 o 00:00), indica si la página de detalle muestra una hora real, cuál es, y si la devolviste en time.

Datos originales:
${JSON.stringify({
  title: originalEvent.title,
  description: originalEvent.description,
  location: originalEvent.location,
  address: originalEvent.address,
  Price: originalEvent.Price,
  image_url: originalEvent.image_url,
  date: originalEvent.date,
  time: originalEvent.time,
}, null, 2)}

HTML de la página de detalle (${eventUrl}):
${pageHtml}`

    const completion = await kiloClient.chat.completions.create({
      model: "deepseek/deepseek-v4-flash-0731",
      messages: [{ role: "user", content: prompt }],
      response_format: enrichmentResponseFormat,
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return { success: false, enrichedFields: {}, dateTimeConfirmed: false, confirmationReason: 'No response from Kilo Gateway', error: 'No response from Kilo Gateway' }
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(responseText)
    } catch (parseError) {
      return { success: false, enrichedFields: {}, dateTimeConfirmed: false, confirmationReason: 'Failed to parse JSON response', error: 'Failed to parse JSON response' }
    }

    const enrichedFields: Record<string, unknown> = {}
    const fieldKeys = ['title', 'description', 'location', 'address', 'Price', 'time', 'image_url'] as const
    for (const key of fieldKeys) {
      if (parsed[key] !== undefined && parsed[key] !== null) {
        enrichedFields[key] = parsed[key]
      }
    }

    const dateTimeConfirmed = parsed.date_time_confirmed === true
    const confirmationReason = typeof parsed.confirmation_reason === 'string' ? parsed.confirmation_reason : 'El modelo no devolvió confirmation_reason'

    return { success: true, enrichedFields: enrichedFields as EnrichmentResult['enrichedFields'], dateTimeConfirmed, confirmationReason }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const errorMessage =
        error.status === 401 ? 'Invalid or missing API key for Kilo Gateway' :
        error.status === 429 ? 'API quota exceeded or rate limit reached' :
        error.status === 408 || error.message.includes('timeout') ? 'Request timeout when calling Kilo Gateway' :
        `Error from Kilo Gateway: ${error.message}`
      return { success: false, enrichedFields: {}, dateTimeConfirmed: false, confirmationReason: `Error durante el enriquecimiento: ${errorMessage}`, error: errorMessage }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, enrichedFields: {}, dateTimeConfirmed: false, confirmationReason: `Error durante el enriquecimiento: ${errorMessage}`, error: errorMessage }
  }
}
