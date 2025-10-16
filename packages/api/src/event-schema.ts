import { Type } from "@google/genai";

/**
 * Schema for extracting events from HTML content using Gemini's structured output
 */
export const eventSchema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      description: "A list of event objects.",
      items: {
        type: Type.OBJECT,
        properties: {
          source_url: {
            type: Type.STRING,
            description: "The provided URL for data extraction from where all other information stems.",
          },
          event_url: {
            type: Type.STRING,
            description: "The URL for the particular event. Usually takes the form of an anchor tag with an URL that users can click to obtain more information about the event. Defaults to source_url.",
          },
          title: {
            type: Type.STRING,
            description: "Title of the event.",
          },
          description: {
            type: Type.STRING,
            description: "A brief description of the event. If a description is not available, create a simple one from the title and context.",
          },
          date: {
            type: Type.STRING,
            description: "The date of the event in YYYY-MM-DD format.",
          },
          time: {
            type: Type.STRING,
            description: "The start time of the event in HH:MM format.",
          },
          location: {
            type: Type.STRING,
            description: "The name of the venue or location.",
          },
          address: {
            type: Type.STRING,
            description: "The full street address of the event. If no address is provided, it should be the same as the event's location.",
          },
          category_slug: {
            type: Type.STRING,
            description: "Category slug for database lookup: 'musica', 'arte', 'gastronomia', 'deportes', 'tecnologia', 'networking', 'cine', 'negocios'",
            enum: ['musica', 'arte', 'gastronomia', 'deportes', 'tecnologia', 'networking', 'cine', 'negocios'],
          },
          city_slug: {
            type: Type.STRING,
            description: "City slug for database lookup: 'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'",
            enum: ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'],
          },
          Price: {
            type: Type.NUMBER,
            description: "The ticket price as a number. If the event is free, the value should be 0. If the price is not specified, this value should be null.",
            nullable: true,
          },
          image_url: {
            type: Type.STRING,
            description: "The URL of the event's image. Check for image tags associated with the event and a URL source. If no image URL is found, this should be null.",
            nullable: true,
          },
        },
        required: ["source_url", "event_url", "title", "description", "date", "time", "location", "address", "category_slug", "city_slug", "Price", "image_url"],
        propertyOrdering: ["source_url", "event_url", "title", "description", "date", "time", "location", "address", "category_slug", "city_slug", "Price", "image_url"],
      },
    },
  },
  required: ["events"],
};

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
  category_slug: 'musica' | 'arte' | 'gastronomia' | 'deportes' | 'tecnologia' | 'networking' | 'cine' | 'negocios';
  city_slug: 'bogota' | 'medellin' | 'cali' | 'barranquilla' | 'cartagena';
  Price: number | null;
  image_url: string | null;
}

/**
 * Type definition for the extraction response
 */
export interface EventExtractionResponse {
  events: ExtractedEvent[];
}