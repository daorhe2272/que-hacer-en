import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventsByCity, formatEventDate, formatEventPrice } from '@/lib/events'
import type { CityKey } from '@/types/event'

type Props = {
  params: { city: string }
}

const validCities = ['bogota', 'medellin', 'cali']

const cityNames: Record<string, string> = {
  bogota: 'Bogotá',
  medellin: 'Medellín',
  cali: 'Cali'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = params
  
  if (!validCities.includes(city)) {
    return {
      title: 'Ciudad no encontrada'
    }
  }

  const cityName = cityNames[city]
  
  return {
    title: `Eventos en ${cityName}`,
    description: `Descubre los mejores eventos y actividades en ${cityName}. Conciertos, festivales, obras de teatro y mucho más.`,
    keywords: [`eventos ${cityName}`, `actividades ${cityName}`, `que hacer en ${cityName}`],
  }
}

export async function generateStaticParams() {
  return validCities.map((city) => ({
    city,
  }))
}

export default function CityEventsPage({ params }: Props) {
  const { city } = params
  
  if (!validCities.includes(city)) {
    notFound()
  }

  const cityName = cityNames[city]
  const events = getEventsByCity(city as CityKey)

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <nav className="text-sm text-gray-500 mb-4">
            <a href="/" className="hover:text-blue-600">Inicio</a> / 
            <span className="ml-1">Eventos en {cityName}</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Eventos en {cityName}
          </h1>
          <p className="text-xl text-gray-600">
            Descubre las mejores actividades y eventos en {cityName}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {events.length} eventos disponibles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <div className="text-xs font-medium bg-white/20 rounded-full px-2 py-1 mb-2">
                    {event.category}
                  </div>
                  <div className="text-sm opacity-90">{event.location}</div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  {event.title}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {formatEventDate(event.date)} • {event.time}
                </p>
                <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                  {event.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">
                    {formatEventPrice(event.price, event.currency)}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {event.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No hay eventos disponibles en {cityName} en este momento.
            </p>
          </div>
        )}
      </div>
    </main>
  )
} 