'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

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

import { useRouter } from 'next/navigation'

interface SearchComponentProps {
  cityId?: string
}

export default function SearchComponent({ cityId }: SearchComponentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL parameters
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
    setSelectedCategory(searchParams.get('category') || '')
  }, [searchParams])

  const handleSearch = () => {
    if (cityId) {
      // Preserve existing search parameters
      const params = new URLSearchParams(searchParams.toString())
      
      // Update search and category parameters
      if (searchTerm.trim()) {
        params.set('q', searchTerm.trim())
      } else {
        params.delete('q')
      }
      
      if (selectedCategory) {
        params.set('category', selectedCategory)
      } else {
        params.delete('category')
      }
      
      // Reset page when search parameters change
      params.delete('page')
      
      const query = params.toString()
      router.push(`/eventos/${cityId}${query ? `?${query}` : ''}`)
      return
    }
    // TODO: Implementar navegación desde home cuando no haya ciudad aún
  }

  return (
    <div data-testid="search" className="bg-white rounded-lg shadow-search p-3 flex flex-col sm:flex-row gap-3 w-full">
      {/* Search Input */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Buscar eventos, artistas, lugares..."
          aria-label="Buscar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full px-4 py-3 text-base placeholder-gray-400 border-0 focus:outline-none focus:ring-0 bg-transparent"
        />
      </div>

      {/* Category Dropdown */}
      <div className="sm:min-w-[200px]">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Categoría"
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
        data-testid="search-submit"
        onClick={handleSearch}
        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium text-base transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
      >
        Buscar
      </button>
    </div>
  )
} 