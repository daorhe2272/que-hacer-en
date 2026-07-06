import { query } from "./db/client";

let categorySlugsCache: string[] | null = null;
let citySlugsCache: string[] | null = null;

/**
 * Lazily loads and caches category slugs from the database for the lifetime of the process,
 * so the extraction schema stays in sync without a DB round-trip on every job/event.
 */
export async function getCategorySlugs(): Promise<string[]> {
  if (categorySlugsCache) return categorySlugsCache;
  const result = await query<{ slug: string }>("SELECT slug FROM categories ORDER BY slug");
  categorySlugsCache = result.rows.map((row) => row.slug);
  return categorySlugsCache;
}

/**
 * Lazily loads and caches city slugs from the database for the lifetime of the process,
 * so the extraction schema stays in sync without a DB round-trip on every job/event.
 */
export async function getCitySlugs(): Promise<string[]> {
  if (citySlugsCache) return citySlugsCache;
  const result = await query<{ slug: string }>("SELECT slug FROM cities ORDER BY slug");
  citySlugsCache = result.rows.map((row) => row.slug);
  return citySlugsCache;
}

/**
 * Schema for extracting events from HTML content using structured output
 * (OpenAI-compatible strict JSON schema, used against Kilo Gateway/DeepSeek).
 */
export function buildEventSchema(categorySlugs: string[], citySlugs: string[]) {
  return {
    type: "object",
    properties: {
      events: {
        type: "array",
        description: "A list of event objects.",
        items: {
          type: "object",
          properties: {
            source_url: {
              type: "string",
              description: "The provided URL for data extraction from where all other information stems.",
            },
            event_url: {
              type: "string",
              description: "The URL for the particular event. Usually takes the form of an anchor tag with an URL that users can click to obtain more information about the event. Defaults to source_url.",
            },
            title: {
              type: "string",
              description: "Title of the event.",
            },
            description: {
              type: "string",
              description: "A brief description of the event. If a description is not available, create a simple one from the title and context.",
            },
            date: {
              type: "string",
              description: "The date of the event in YYYY-MM-DD format.",
            },
            time: {
              type: "string",
              description: "The start time of the event in HH:MM format.",
            },
            location: {
              type: "string",
              description: "The name of the venue or location.",
            },
            address: {
              type: "string",
              description: "The full street address of the event. If no address is provided, it should be the same as the event's location.",
            },
            category_slug: {
              type: "string",
              description: `Category slug for database lookup: ${categorySlugs.map((slug) => `'${slug}'`).join(", ")}. If none of the categories fit perfectly, choose the closest matching one — never invent a value outside this list.`,
              enum: categorySlugs,
            },
            city_slug: {
              type: "string",
              description: `City slug for database lookup: ${citySlugs.map((slug) => `'${slug}'`).join(", ")}. If none of the cities fit perfectly, choose the closest matching one — never invent a value outside this list.`,
              enum: citySlugs,
            },
            Price: {
              type: ["number", "null"],
              description: "The ticket price as a number. If the event is free, the value should be 0. If the price is not specified, this value should be null.",
            },
            image_url: {
              type: ["string", "null"],
              description: "The URL of the event's image. Check for image tags associated with the event and a URL source. If no image URL is found, this should be null.",
            },
          },
          required: ["source_url", "event_url", "title", "description", "date", "time", "location", "address", "category_slug", "city_slug", "Price", "image_url"],
          additionalProperties: false,
        },
      },
    },
    required: ["events"],
    additionalProperties: false,
  };
}

/**
 * Response format envelope for OpenAI-compatible structured output (strict mode).
 */
export function buildEventResponseFormat(categorySlugs: string[], citySlugs: string[]) {
  return {
    type: "json_schema",
    json_schema: {
      name: "event_extraction",
      schema: buildEventSchema(categorySlugs, citySlugs),
      strict: true,
    },
  } as const;
}

/**
 * Type definition for extracted event
 */
export interface ExtractedEvent {
  source_url: string;
  event_url: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  category_slug: string;
  city_slug: string;
  Price: number | null;
  image_url: string | null;
}

/**
 * Type definition for the extraction response
 */
export interface EventExtractionResponse {
  events: ExtractedEvent[];
}