import OpenAI from "openai";
import { getKiloClient } from "./llm-client";
import { buildEventResponseFormat, getCategorySlugs, getCitySlugs, EventExtractionResponse } from "../event-schema";

/**
 * Extracts events from HTML content using Kilo Gateway (MiniMax M3) with structured output
 */
export async function extractEventsFromHtml(html: string, sourceUrl: string): Promise<{
  success: boolean;
  events?: EventExtractionResponse["events"];
  error?: string;
}> {
  const currentYear = new Date().getFullYear();
  try {

    const kiloClient = getKiloClient();

    const [categorySlugs, citySlugs] = await Promise.all([getCategorySlugs(), getCitySlugs()]);

    // Create the prompt for extracting events
    const prompt = `Extract all distinct events from the following HTML content.
    The source URL is: ${sourceUrl}
    The current year is ${currentYear}. For events that have a defined date but no year specified, assume the year is ${currentYear}.

    HTML content:
    ${html}

    Please extract all events and return them in the specified JSON format. If no events are found, return an empty array.`;


    // Generate content with structured output
    const completion = await kiloClient.chat.completions.create({
      model: "minimax/minimax-m3",
      messages: [{ role: "user", content: prompt }],
      response_format: buildEventResponseFormat(categorySlugs, citySlugs),
    });

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