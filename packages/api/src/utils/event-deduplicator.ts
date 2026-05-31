import { GoogleGenAI } from "@google/genai"
import { Type } from "@google/genai"

export interface ExistingEventSummary {
  id: string
  title: string
  location: string
  date: string
}

export interface SemanticDuplicateResult {
  candidateIndex: number
  isDuplicate: boolean
  duplicateOfId?: string
  reason?: string
}

const dedupSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          candidate_index: { type: Type.INTEGER },
          is_duplicate: { type: Type.BOOLEAN },
          duplicate_of_id: { type: Type.STRING, nullable: true },
          reason: { type: Type.STRING, nullable: true },
        },
        required: ["candidate_index", "is_duplicate"],
      },
    },
  },
  required: ["results"],
}

export async function checkSemanticDuplicates(
  candidates: Array<{ index: number; title: string; location: string; date: string }>,
  existingEvents: ExistingEventSummary[]
): Promise<SemanticDuplicateResult[]> {
  if (existingEvents.length === 0 || candidates.length === 0) return []

  try {
    const ai = new GoogleGenAI({})

    const existingList = existingEvents
      .map(e => `  ID: ${e.id} | Título: "${e.title}" | Lugar: "${e.location}" | Fecha: ${e.date}`)
      .join("\n")

    const candidateList = candidates
      .map(c => `  Índice: ${c.index} | Título: "${c.title}" | Lugar: "${c.location}" | Fecha: ${c.date}`)
      .join("\n")

    const prompt = `Eres un juez de duplicados para una plataforma de eventos. Determina si cada evento candidato se refiere a algún evento existente.

Considera duplicados los eventos que, aunque tengan títulos parafraseados o lugares abreviados, representan el mismo evento (misma fecha, misma ciudad y mismo tipo de actividad).

Eventos existentes en la base de datos:
${existingList}

Eventos candidatos (nuevos):
${candidateList}

Para cada candidato, indica si es duplicado de algún evento existente. Si es duplicado, proporciona el ID del evento existente y una breve razón.`

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: dedupSchema,
      },
    })

    const responseText = response.text
    if (!responseText) {
      console.warn("[Event Deduplicator] No response from Gemini, returning no duplicates")
      return []
    }

    let parsed: { results: Array<{ candidate_index: number; is_duplicate: boolean; duplicate_of_id?: string; reason?: string }> }
    try {
      parsed = JSON.parse(responseText)
    } catch (parseError) {
      console.warn("[Event Deduplicator] Failed to parse JSON response:", parseError)
      return []
    }

    if (!parsed.results || !Array.isArray(parsed.results)) return []

    return parsed.results.map(r => ({
      candidateIndex: r.candidate_index,
      isDuplicate: r.is_duplicate,
      duplicateOfId: r.duplicate_of_id,
      reason: r.reason,
    }))
  } catch (error) {
    console.warn("[Event Deduplicator] Error checking semantic duplicates:", error)
    if (error instanceof Error) {
      if (error.message.includes("quota") || error.message.includes("rate")) {
        console.warn("[Event Deduplicator] API quota/rate limit reached, returning no duplicates")
      }
    }
    return []
  }
}
