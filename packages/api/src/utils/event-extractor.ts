import { GoogleGenAI } from "@google/genai";
import { eventSchema, EventExtractionResponse } from "../event-schema";

/**
 * Extracts events from HTML content using Google's Gemini API with structured output
 */
export async function extractEventsFromHtml(html: string, sourceUrl: string): Promise<{
  success: boolean;
  events?: EventExtractionResponse["events"];
  error?: string;
}> {
  try {

    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({});

    // Create the prompt for extracting events
    const prompt = `Extract all distinct events from the following HTML content.
    The source URL is: ${sourceUrl}

    HTML content:
    ${html}

    Please extract all events and return them in the specified JSON format. If no events are found, return an empty array.`;


    // Generate content with structured output
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: eventSchema,
      },
    });

    // Parse the response
    const responseText = response.text;
    
    if (!responseText) {
      return {
        success: false,
        error: "No response received from Gemini API"
      };
    }

    let parsedResponse: EventExtractionResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Event Extractor] Failed to parse JSON response:", parseError);
      return {
        success: false,
        error: "Failed to parse JSON response from Gemini API"
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
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        return {
          success: false,
          error: "Invalid or missing API key for Gemini API"
        };
      }
      
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return {
          success: false,
          error: "API quota exceeded or rate limit reached"
        };
      }
      
      if (error.message.includes("timeout")) {
        return {
          success: false,
          error: "Request timeout when calling Gemini API"
        };
      }
      
      return {
        success: false,
        error: `Error from Gemini API: ${error.message}`
      };
    }
    
    return {
      success: false,
      error: "Unknown error occurred while extracting events"
    };
  }
}