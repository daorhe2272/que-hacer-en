'use client'

import { useState } from 'react'

const categories = [
  { value: '', label: 'Todas las categorías' },
  { value: 'musica', label: 'Música' },
  { value: 'arte', label: 'Arte' },
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'networking', label: 'Networking' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'cine', label: 'Cine' },
]

export default function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Searching for:', { searchTerm, selectedCategory })
  }

  return (
    <div className="bg-white rounded-lg shadow-search p-3 flex flex-col sm:flex-row gap-3 w-full">
      {/* Search Input */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Buscar eventos, artistas, lugares..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 text-base placeholder-gray-400 border-0 focus:outline-none focus:ring-0 bg-transparent"
        />
      </div>

      {/* Category Dropdown */}
      <div className="sm:min-w-[200px]">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-3 text-base text-gray-600 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium text-base transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
      >
        Buscar
      </button>
    </div>
  )
} 