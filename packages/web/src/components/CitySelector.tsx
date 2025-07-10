'use client'

import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'

export default function CitySelector() {
  const router = useRouter()

  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const city = event.target.value
    
    // Auto-redirect when city is selected
    if (city) {
      router.push(`/eventos/${city}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 shadow-card animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-8 h-8 text-primary-600" />
        <h3 className="text-xl font-bold text-gray-900">¿Dónde quieres descubrir eventos?</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">Selecciona tu ciudad</p>
      
      <select 
        onChange={handleCityChange}
        className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Elige una ciudad...</option>
        <option value="bogota">Bogotá - Capital de Colombia</option>
        <option value="medellin">Medellín - Ciudad de la eterna primavera</option>
        <option value="cali">Cali - Capital mundial de la salsa</option>
        <option value="barranquilla">Barranquilla - Puerta de Oro del Caribe</option>
      </select>
    </div>
  )
} 