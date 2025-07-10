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
      <TopNavigation />
      
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <img src="/logo-wide-dark.png" alt="¿Qué hacer en...?" className="h-16 w-auto rounded-lg border border-gray-700" />
              </div>
              <p className="text-gray-400 mb-4">
                Descubre los mejores eventos en toda Colombia. Conciertos, festivales, talleres, gastronomía y mucho más.
              </p>
            </div>

            {/* Enlaces útiles */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces útiles</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Acerca de nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vender entradas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            {/* Categorías */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Categorías</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Música y conciertos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Arte y cultura</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Gastronomía</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Deportes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tecnología</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recibe actualizaciones</h3>
              <p className="text-gray-400 mb-4">
                Suscríbete para recibir noticias sobre eventos en tu zona.
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="Tu email"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                />
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                  Suscribirse
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
              <p className="mb-4 md:mb-0">
                © 2025 ¿Qué hacer en...? - Todos los derechos reservados
              </p>
              <div className="flex space-x-6">
                <a href="#" className="hover:text-white transition-colors">
                  Términos de servicio
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Política de privacidad
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
} 