import { Event } from '@/types/event'

interface EventsJsonLdProps {
  events: Event[]
  cityName: string
  city: string
}

export default function EventsJsonLd({ events, cityName, city }: EventsJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL
  
  // Create JSON-LD for EventListing page
  const eventListingSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `Eventos en ${cityName}`,
    "description": `Descubre los mejores eventos y actividades en ${cityName}. Conciertos, festivales, obras de teatro y mucho más.`,
    "url": `${baseUrl}/eventos/${city}`,
    "mainEntity": {
      "@type": "ItemList",
      "name": `Eventos en ${cityName}`,
      "description": `Lista de eventos disponibles en ${cityName}`,
      "numberOfItems": events.length,
      "itemListElement": events.slice(0, 10).map((event, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Event",
          "name": event.title,
          "description": event.description,
          "startDate": new Date(event.utcTimestamp).toISOString(),
          "endDate": new Date(event.utcTimestamp).toISOString(),
          "location": {
            "@type": "Place",
            "name": event.location,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": event.address,
              "addressLocality": cityName,
              "addressCountry": "CO"
            }
          },
          "offers": {
            "@type": "Offer",
            "price": event.price !== null ? event.price.toString() : "0",
            "priceCurrency": event.currency,
            "availability": event.status === 'sold_out' ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
          },
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "category": event.category,
          "image": event.image || `${baseUrl}/og-image.jpg`,
          "url": `${baseUrl}/eventos/${city}?id=${event.id}`
        }
      }))
    }
  }

  // Create breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": `Eventos en ${cityName}`,
        "item": `${baseUrl}/eventos/${city}`
      }
    ]
  }

  // Combine schemas
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [eventListingSchema, breadcrumbSchema]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(combinedSchema)
      }}
    />
  )
}