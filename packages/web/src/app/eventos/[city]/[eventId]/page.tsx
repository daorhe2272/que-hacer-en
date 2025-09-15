import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TopNavigation from '@/components/TopNavigation'
import EventDetails from '@/components/EventDetails'
import type { Event } from '@/types/event'

export const dynamic = 'force-dynamic'

type Props = {
  params: { city: string; eventId: string }
}

const validCities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena']

const cityNames: Record<string, string> = {
  bogota: 'Bogotá',
  medellin: 'Medellín',
  cali: 'Cali',
  barranquilla: 'Barranquilla',
  cartagena: 'Cartagena'
}

async function fetchEventDetails(eventId: string): Promise<Event | null> {
  try {
    const SERVER_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001'
    const response = await fetch(`${SERVER_API_URL}/api/events/uuid/${eventId}`, {
      headers: {
        'x-correlation-id': crypto.randomUUID()
      },
      next: { revalidate: 300 } // Revalidate every 5 minutes
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching event details:', error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, eventId } = params

  if (!validCities.includes(city)) {
    return {
      title: 'Ciudad no encontrada'
    }
  }

  const event = await fetchEventDetails(eventId)

  if (!event) {
    return {
      title: 'Evento no encontrado'
    }
  }

  const cityName = cityNames[city]
  const title = `${event.title} - ${cityName}`
  const description = event.description.length > 160
    ? `${event.description.substring(0, 157)}...`
    : event.description
  const url = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/eventos/${city}/${eventId}`

  return {
    title,
    description,
    keywords: [event.title, cityName, event.category, ...event.tags],
    openGraph: {
      title,
      description,
      url,
      siteName: '¿Qué hacer en...?',
      locale: 'es_CO',
      type: 'article',
      images: [
        {
          url: event.image || `${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [event.image || `${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/og-image.jpg`],
      creator: '@quehaceren',
      site: '@quehaceren',
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function EventDetailsPage({ params }: Props) {
  const { city, eventId } = params

  if (!validCities.includes(city)) {
    notFound()
  }

  const event = await fetchEventDetails(eventId)

  if (!event) {
    notFound()
  }

  const cityName = cityNames[city]

  return (
    <>
      {/* Top Navigation */}
      <TopNavigation />

      <div className="min-h-screen bg-gray-50">
        {/* Event Details */}
        <EventDetails event={event} cityName={cityName} cityId={city} />
      </div>
    </>
  )
}