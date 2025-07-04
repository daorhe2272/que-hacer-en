'use client'

import { useState } from 'react'

const cities = [
  { key: 'bogota', name: 'Bogotá' },
  { key: 'medellin', name: 'Medellín' },
  { key: 'cali', name: 'Cali' },
  { key: 'barranquilla', name: 'Barranquilla' },
]

interface TopNavigationProps {
  currentCity?: string
}

export default function TopNavigation({ currentCity }: TopNavigationProps) {
  const [selectedCity, setSelectedCity] = useState(currentCity || '')

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-[100] w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-xl font-bold text-primary-600">
              Qué hacer en...
            </a>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            {/* Location Selector */}
            <div className="flex items-center space-x-2">
              <svg 
                className="w-5 h-5 text-gray-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" 
                  clipRule="evenodd" 
                />
              </svg>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value)
                  if (e.target.value) {
                    window.location.href = `/eventos/${e.target.value}`
                  }
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecciona tu ciudad</option>
                {cities.map((city) => (
                  <option key={city.key} value={city.key}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Button Alternative */}
            <button
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Seleccionar ubicación</span>
              <svg 
                className="w-4 h-4" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>

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
    </nav>
  )
} 