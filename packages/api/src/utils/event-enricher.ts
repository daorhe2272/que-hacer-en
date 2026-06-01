import { GoogleGenAI, Type } from "@google/genai"
import { ExtractedEvent } from "../event-schema"

export interface EnrichmentResult {
  success: boolean
  enrichedFields: Partial<Pick<ExtractedEvent, 'title' | 'description' | 'location' | 'address' | 'Price' | 'image_url'>>
  dateTimeConfirmed: boolean
  error?: string
}

const enrichmentSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, nullable: true },
    description: { type: Type.STRING, nullable: true },
    location: { type: Type.STRING, nullable: true },
    address: { type: Type.STRING, nullable: true },
    Price: { type: Type.NUMBER, nullable: true },
    image_url: { type: Type.STRING, nullable: true },
    date_time_confirmed: { type: Type.BOOLEAN },
  },
  required: ["date_time_confirmed"],
}

export async function enrichEventFromHtml(
  html: string,
  originalEvent: ExtractedEvent,
  eventUrl: string
): Promise<EnrichmentResult> {
  try {
    const ai = new GoogleGenAI({})

    const prompt = `Eres un asistente que mejora datos de eventos. Se te proporciona:
1. Los datos originales extraídos de una página de internet o un documento con información de eventos.
2. El HTML de una página de internet con detalles del evento individual a mejorar.

Instrucciones:
- Para los campos title, description, location, address, Price, image_url: devuelve el valor de la página de detalle SÓLO si es más específico o detallado que el original. Si el original ya es igual de bueno o no hay mejora, devuelve null.
- NO modifiques date, time, city_slug, category_slug — son campos estructurales.
- Para date_time_confirmed: devuelve true si la fecha y hora en la página de detalle coinciden con los datos originales (date: "${originalEvent.date}", time: "${originalEvent.time}"). Devuelve false si difieren o la página no tiene info de fecha/hora.

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
${html}`

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: enrichmentSchema,
      },
    })

    const responseText = response.text
    if (!responseText) {
      return { success: false, enrichedFields: {}, dateTimeConfirmed: false, error: 'No response from Gemini' }
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(responseText)
    } catch (parseError) {
      console.warn("[Event Enricher] Failed to parse JSON response:", parseError)
      return { success: false, enrichedFields: {}, dateTimeConfirmed: false, error: 'Failed to parse JSON response' }
    }

    const enrichedFields: Record<string, unknown> = {}
    const fieldKeys = ['title', 'description', 'location', 'address', 'Price', 'image_url'] as const
    for (const key of fieldKeys) {
      if (parsed[key] !== undefined && parsed[key] !== null) {
        enrichedFields[key] = parsed[key]
      }
    }

    const dateTimeConfirmed = parsed.date_time_confirmed === true

    return { success: true, enrichedFields: enrichedFields as EnrichmentResult['enrichedFields'], dateTimeConfirmed }
  } catch (error) {
    console.warn("[Event Enricher] Error enriching event:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, enrichedFields: {}, dateTimeConfirmed: false, error: errorMessage }
  }
}
