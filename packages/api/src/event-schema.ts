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
 * Field-level guidance shared by the extraction and enrichment LLM calls (event-extractor.ts
 * and event-enricher.ts). Both processes read and/or write these fields, so the semantics must
 * stay identical across calls — defined once here instead of duplicated in each prompt.
 *
 * Written in Spanish since both prompts are in Spanish.
 */
export const SHARED_FIELD_GUIDELINES = `- title: el título del evento.
- description: una breve descripción del evento. Si no hay una disponible, escribe una simple a partir del título y el contexto.
- date: la fecha del evento en formato YYYY-MM-DD.
- time: la hora de inicio del evento en formato HH:MM (24 horas). "08:00" y "00:00" son valores centinela que indican que no se encontró una hora real — no representan una hora de inicio confirmada.
- location: el nombre del lugar o recinto.
- address: la dirección completa del evento. Si no se especifica una dirección, usa el mismo valor que location.
- Price: el precio de la entrada como número. Usa 0 SÓLO si la página indica explícitamente que el evento es gratuito (p. ej. "gratis", "entrada libre", "free", "$0"). Si no hay información de precio visible, usa null — NO asumas que un evento es gratuito solo porque no se muestra un precio.`;

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
        items: {
          type: "object",
          properties: {
            source_url: { type: "string" },
            event_url: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            location: { type: "string" },
            address: { type: "string" },
            category_slug: { type: "string", enum: categorySlugs },
            city_slug: { type: "string", enum: citySlugs },
            Price: { type: ["number", "null"] },
            image_url: { type: ["string", "null"] },
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