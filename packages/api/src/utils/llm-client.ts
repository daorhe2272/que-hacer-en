import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Lazily-constructed singleton client for Kilo Gateway (OpenAI-compatible),
 * used by the mining pipeline's extraction and enrichment steps.
 */
export function getKiloClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://api.kilo.ai/api/gateway",
      apiKey: process.env.KILO_API_KEY,
    });
  }

  return client;
}