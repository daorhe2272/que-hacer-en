import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventsByCity } from '@/lib/events'
import type { CityKey } from '@/types/event'
import TopNavigation from '@/components/TopNavigation'
import HeroSection from '@/components/HeroSection'
import CategoryFilters from '@/components/CategoryFilters'
import EventCard from '@/components/EventCard'

type Props = {
  params: { city: string }
}

const validCities = ['bogota', 'medellin', 'cali', 'barranquilla']

const cityNames: Record<string, string> = {
  bogota: 'Bogotá',
  medellin: 'Medellín',
  cali: 'Cali',
  barranquilla: 'Barranquilla'
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
    <>
      {/* Top Navigation */}
      <TopNavigation currentCity={city} />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <HeroSection cityName={cityName} />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                Eventos populares cerca de ti
              </h2>
              <p className="text-gray-600">
                Descubre los mejores eventos para disfrutar
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-300 ease-in-out">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Fecha
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-300 ease-in-out">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Filtros
              </button>
            </div>
          </div>

          {/* Category Filters */}
          <CategoryFilters />

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Empty State */}
          {events.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay eventos disponibles
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No hay eventos disponibles en {cityName} en este momento. Te notificaremos cuando haya nuevos eventos.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  )
} 