import type { Metadata } from 'next'
import TopNavigation from '@/components/TopNavigation'
import CitySelector from '@/components/CitySelector'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '¿Qué hacer en...? - Descubre los mejores eventos en Colombia',
  description: 'Selecciona tu ciudad y descubre los mejores eventos y actividades cerca de ti. Conciertos, festivales, arte y cultura en toda Colombia.',
  keywords: ['eventos colombia', 'actividades colombia', 'conciertos', 'festivales', 'que hacer'],
  openGraph: {
    title: '¿Qué hacer en...? - Descubre los mejores eventos en Colombia',
    description: 'Selecciona tu ciudad y descubre los mejores eventos y actividades cerca de ti. Conciertos, festivales, arte y cultura en toda Colombia.',
    url: process.env.NEXT_PUBLIC_WEB_URL,
    siteName: '¿Qué hacer en...?',
    locale: 'es_CO',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_WEB_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: '¿Qué hacer en...? - Eventos en Colombia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '¿Qué hacer en...? - Descubre los mejores eventos en Colombia',
    description: 'Selecciona tu ciudad y descubre los mejores eventos y actividades cerca de ti.',
    images: [`${process.env.NEXT_PUBLIC_WEB_URL}/og-image.jpg`],
    creator: '@quehaceren',
    site: '@quehaceren',
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_WEB_URL,
  },
}

import { fetchAllEventsServer } from '@/lib/api-server'
import EventCard from '@/components/EventCard'
import ScrollToHash from '@/components/ScrollToHash'

export default async function HomePage({ 
  searchParams 
}: { 
  searchParams?: { q?: string; category?: string; page?: string; limit?: string }
}) {
  const searchQuery = searchParams?.q
  
  // If there's a search query, fetch search results
  let searchResults = null
  if (searchQuery) {
    const category = searchParams?.category || ''
    const page = searchParams?.page ? Number(searchParams.page) : 1
    const limit = searchParams?.limit ? Number(searchParams.limit) : undefined
    
    searchResults = await fetchAllEventsServer({ 
      category: category || undefined, 
      q: searchQuery, 
      page, 
      limit 
    })
  }
  
  return (
    <>
      {/* Scroll to hash handler */}
      <ScrollToHash />
      
      {/* Top Navigation */}
      <TopNavigation />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section 
          className="relative bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-background.jpeg')"
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-slideIn">
                Descubre qué hacer en{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-300">Colombia</span>
              </h1>
              
              {searchQuery ? (
                <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-fadeIn">
                  Resultados para: <span className="text-orange-300 font-semibold">&ldquo;{searchQuery}&rdquo;</span>
                </p>
              ) : (
                <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-fadeIn">
                  Los mejores eventos, conciertos, talleres y experiencias en Colombia
                </p>
              )}

              {/* Always show City Selector */}
              <CitySelector />

              {/* Organizer CTA Section - Only show on home */}
              {!searchQuery && (
                <div className="mt-16">
                  <h3 className="text-xl font-bold text-white mb-2">
                    ¿Organizas eventos?
                  </h3>
                  <p className="text-white/90 mb-6">
                    Publica tu evento gratis
                  </p>
                  <a href="/crear-evento" className="inline-block bg-accent-400 hover:bg-accent-500 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2">
                    Publicar evento gratuito
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Search Results Section */}
        {searchQuery && searchResults && (
          <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {searchResults.pagination?.total ? `${searchResults.pagination.total} eventos encontrados` : 'Eventos encontrados'}
              </h2>
              <p className="text-gray-600">
                Resultados de tu búsqueda en toda Colombia
              </p>
            </div>

            {searchResults.events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No encontramos eventos
                </h3>
                <p className="text-gray-600 mb-6">
                  Intenta con otros términos de búsqueda o explora eventos por ciudad
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Volver al inicio
                  </a>
                  <a href="/eventos/bogota" className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-3 rounded-lg font-medium transition-colors">
                    Ver eventos en Bogotá
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Why Choose Section */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Por qué elegir <span className="text-primary-600">¿qué hacer en...?</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                La plataforma líder para descubrir y publicar eventos únicos en Colombia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Descubre fácilmente</h3>
                <p className="text-gray-600">
                  Encuentra eventos por categoría, fecha, ubicación o precio. Nuestra búsqueda inteligente te ayuda a descubrir exactamente lo que buscas.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Eventos cerca de ti</h3>
                <p className="text-gray-600">
                  Localiza eventos en tu ciudad o descubre qué hacer cuando viajes. Cobertura completa en toda América Latina.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Nunca te pierdas nada</h3>
                <p className="text-gray-600">
                  Guarda eventos en tu calendario personal y recibe recordatorios. Sincroniza con Google Calendar y Apple Calendar.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Comunidad activa</h3>
                <p className="text-gray-600">
                  Conecta con personas que comparten tus intereses. Ve quién más asiste y haz nuevas conexiones.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Fácil de Usar</h3>
                <p className="text-gray-600">
                  Interfaz intuitiva diseñada para que encuentres lo que buscas rápidamente, sin complicaciones.
                </p>
              </div>
                         </div>
           </div>
         </section>

         {/* Footer */}
         <footer className="bg-gray-900 text-white">
           <div className="container mx-auto px-4 py-12">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {/* Brand Section */}
               <div className="lg:col-span-1">
                  <div className="mb-4">
                    <Image src="/logo-wide-dark.png" alt="¿Qué hacer en...?" width={256} height={64} className="h-16 w-auto rounded-lg border border-gray-700" />
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
       </div>
     </>
   )
 } 