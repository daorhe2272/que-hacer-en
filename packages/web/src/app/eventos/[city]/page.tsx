import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchAllEventsServer } from '@/lib/api-server'
import TopNavigation from '@/components/TopNavigation'
import HeroSection from '@/components/HeroSection'
import Image from 'next/image'
//
import EventCard from '@/components/EventCard'
//
import ClientFilters from '@/components/ClientFilters'
import ErrorBannerClient from '@/components/ErrorBannerClient'
import NoResults from '@/components/NoResults'
import PageSizeSelector from '@/components/PageSizeSelector'
import Pagination from '@/components/Pagination'
import EventsJsonLd from '@/components/EventsJsonLd'
import ScrollToHash from '@/components/ScrollToHash'

export const dynamic = 'force-dynamic'

type Props = {
  params: { city: string }
}

const validCities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena']

const cityNames: Record<string, string> = {
  bogota: 'Bogotá',
  medellin: 'Medellín',
  cali: 'Cali',
  barranquilla: 'Barranquilla',
  cartagena: 'Cartagena'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = params
  
  if (!validCities.includes(city)) {
    return {
      title: 'Ciudad no encontrada'
    }
  }

  const cityName = cityNames[city]
  const title = `Eventos en ${cityName}`
  const description = `Descubre los mejores eventos y actividades en ${cityName}. Conciertos, festivales, obras de teatro y mucho más.`
  const url = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/eventos/${city}`
  
  return {
    title,
    description,
    keywords: [`eventos ${cityName}`, `actividades ${cityName}`, `que hacer en ${cityName}`],
    openGraph: {
      title,
      description,
      url,
      siteName: '¿Qué hay pa\' hacer?',
      locale: 'es_CO',
      type: 'website',
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `Eventos en ${cityName} - ¿Qué hay pa&apos; hacer?`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${process.env.NEXT_PUBLIC_WEB_URL || 'https://quehaceren.co'}/og-image.jpg`],
      creator: '@quehaceren',
      site: '@quehaceren',
    },
    alternates: {
      canonical: url,
    },
  }
}

export async function generateStaticParams() {
  return validCities.map((city) => ({
    city,
  }))
}

export default async function CityEventsPage({ params, searchParams }: { params: { city: string }, searchParams?: { q?: string, category?: string, page?: string, limit?: string, sort?: 'date' | 'price', order?: 'asc' | 'desc' } }) {
  const { city } = params
  
  if (!validCities.includes(city)) {
    notFound()
  }

  const cityName = cityNames[city]
  const category = searchParams?.category || ''
  const q = searchParams?.q || ''
  const page = searchParams?.page ? Number(searchParams.page) : 1
  const sort = searchParams?.sort
  const order = searchParams?.order
  const limit = searchParams?.limit ? Number(searchParams.limit) : undefined
  const { events, pagination, error } = await fetchAllEventsServer({ city, category: category || undefined, q: q || undefined, page, limit, sort, order })

  return (
    <>
      {/* JSON-LD Structured Data */}
      <EventsJsonLd events={events} cityName={cityName} city={city} />
      
      {/* Scroll to hash handler */}
      <ScrollToHash />
      
      {/* Top Navigation */}
      <TopNavigation />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <HeroSection cityName={cityName} cityId={city} />
        
        {/* Main Content */}
        <main id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-20">
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
              <PageSizeSelector city={city} limit={limit} />
            </div>
          </div>

          {/* Error State */}
          {error && <ErrorBannerClient message={error} />}

          {/* Category Filters */}
          {/* Client controller for query param navigation */}
          <ClientFilters city={city} selectedCategory={category || 'todos'} />

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Empty State */}
          {events.length === 0 && (
            <NoResults cityId={city} cityName={cityName} query={q} category={category} />
          )}

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="mt-6">
              <Pagination city={city} page={pagination.page} totalPages={pagination.totalPages} q={q} category={category} limit={limit} />
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
                <Image src="/logo-wide-dark.png" alt="¿Qué hay pa&apos; hacer?" width={256} height={64} className="h-16 w-auto rounded-lg border border-gray-700" />
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
                © 2025 ¿Qué hay pa&apos; hacer? - Todos los derechos reservados
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

// --