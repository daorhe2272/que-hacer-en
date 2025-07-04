import type { Metadata } from 'next'
import TopNavigation from '@/components/TopNavigation'

export const metadata: Metadata = {
  title: 'Inicio',
  description: 'Selecciona tu ciudad y descubre los mejores eventos y actividades cerca de ti.',
}

export default function HomePage() {
  return (
    <>
      {/* Top Navigation */}
      <TopNavigation />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-slideIn">
                Descubre qué hacer en{' '}
                <span className="text-accent-400">América Latina</span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-fadeIn">
                Los mejores eventos, conciertos, talleres y experiencias en las principales ciudades de la región
              </p>
            </div>
          </div>
        </section>

        {/* Cities Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Selecciona tu ciudad
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Encuentra eventos únicos y experiencias increíbles en las ciudades más vibrantes de América Latina
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Bogotá */}
              <a 
                href="/eventos/bogota"
                className="group bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden hover:-translate-y-1 animate-fadeIn"
              >
                <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Bogotá</h3>
                    <p className="text-sm opacity-90">Capital de Colombia</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">24 eventos activos</span>
                    <svg className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </a>
              
              {/* Medellín */}
              <a 
                href="/eventos/medellin"
                className="group bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden hover:-translate-y-1 animate-fadeIn"
              >
                <div className="h-48 bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Medellín</h3>
                    <p className="text-sm opacity-90">Ciudad de la eterna primavera</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">18 eventos activos</span>
                    <svg className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </a>
              
              {/* Cali */}
              <a 
                href="/eventos/cali"
                className="group bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden hover:-translate-y-1 animate-fadeIn"
              >
                <div className="h-48 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Cali</h3>
                    <p className="text-sm opacity-90">Capital mundial de la salsa</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">15 eventos activos</span>
                    <svg className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </a>
              
              {/* Barranquilla */}
              <a 
                href="/eventos/barranquilla"
                className="group bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden hover:-translate-y-1 animate-fadeIn"
              >
                <div className="h-48 bg-gradient-to-br from-accent-400 to-orange-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Barranquilla</h3>
                    <p className="text-sm opacity-90">Puerta de Oro del Caribe</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">12 eventos activos</span>
                    <svg className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  )
} 