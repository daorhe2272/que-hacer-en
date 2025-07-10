'use client'

import { MapPin, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const cities = [
  { id: 'bogota', name: 'Bogotá' },
  { id: 'medellin', name: 'Medellín' },
  { id: 'cali', name: 'Cali' },
  { id: 'barranquilla', name: 'Barranquilla' },
  { id: 'cartagena', name: 'Cartagena' }
]

export default function TopNavigation() {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  function handleCitySelect(cityId: string) {
    setIsDropdownOpen(false)
    router.push(`/eventos/${cityId}`)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-[9999] w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center">
              <img src="/logo-wide.png" alt="¿Qué hacer en...?" className="h-12 w-auto" />
            </a>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            {/* City Selector */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg transition-colors duration-200"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Seleccionar ciudad</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city.id)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Search Icon */}
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Create Event Button */}
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              Crear Evento
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  )
} 