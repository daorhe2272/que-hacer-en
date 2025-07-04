import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inicio',
  description: 'Selecciona tu ciudad y descubre los mejores eventos y actividades cerca de ti.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ¿Qué hacer en...?
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Descubre los mejores eventos y actividades en tu ciudad
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Bogotá</h2>
            <p className="text-gray-600 mb-4">Capital de Colombia</p>
            <a 
              href="/eventos/bogota" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Ver eventos
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Medellín</h2>
            <p className="text-gray-600 mb-4">Ciudad de la eterna primavera</p>
            <a 
              href="/eventos/medellin" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Ver eventos
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Cali</h2>
            <p className="text-gray-600 mb-4">Capital de la salsa</p>
            <a 
              href="/eventos/cali" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Ver eventos
            </a>
          </div>
        </div>
      </div>
    </main>
  )
} 