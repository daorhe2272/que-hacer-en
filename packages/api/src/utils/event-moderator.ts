import { GoogleGenAI } from "@google/genai";

// Define SchemaType locally since it's not exported from the package in this version
enum SchemaType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

export interface ModerationResult {
  safe: boolean;
  reason?: string;
}

/**
 * Moderates event content using Google's Gemini API to detect harmful or inappropriate content.
 */
export async function moderateEventContent(
  title: string,
  description: string,
  location: string
): Promise<ModerationResult> {
  try {
    // Initialize the Google GenAI client
    // We use the same environment variable as the event extractor
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("[Event Moderator] Missing GOOGLE_API_KEY, skipping moderation (defaulting to safe)");
      return { safe: true };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    You are a content moderator for a local events platform. Your task is to analyze the following event details and determine if the content is appropriate for a general audience.

    Event Details:
    - Title: ${title}
    - Description: ${description}
    - Location: ${location}

    Criteria for UNSAFE content (safe = false):
    1. Hate speech, discrimination, or harassment.
    2. Violence, illegal acts, or promotion of self-harm.
    3. Explicit sexual content or nudity.
    4. Political campaigning or propaganda (distinct from neutral political debates or civic education).
    5. Religious proselytizing or recruitment (distinct from cultural festivals or community gatherings).
    6. Scams, fraud, or misleading information.

    If the content violates any of these criteria, mark it as unsafe and provide a brief reason (in Spanish).
    If the content is safe, mark it as safe. The reason can be omitted in that case.

    Return the result in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            safe: { type: SchemaType.BOOLEAN },
            reason: { type: SchemaType.STRING },
          },
          required: ["safe"],
        },
      },
    });

    const responseText = response.text;

    if (!responseText) {
      console.warn("[Event Moderator] No response from AI, defaulting to safe");
      return { safe: true };
    }

    const result = JSON.parse(responseText) as ModerationResult;
    
    // Log unsafe attempts for monitoring
    if (!result.safe) {
      console.log(`[Event Moderator] Content flagged as unsafe: ${result.reason}`);
    }

    return result;

  } catch (error) {
    console.error("[Event Moderator] Error moderating content:", error);
    // Fail open (allow content) or fail closed (block content) depending on policy.
    // For now, we'll fail open to avoid blocking legitimate users during API outages,
    // but log the error.
    return { safe: true };
  }
}