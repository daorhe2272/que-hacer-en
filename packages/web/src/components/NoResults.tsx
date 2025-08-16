'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  cityId: string
  cityName: string
  query?: string
  category?: string
}

const suggestedCategories = [
  { key: 'musica', label: 'Música' },
  { key: 'arte', label: 'Arte' },
  { key: 'gastronomia', label: 'Gastronomía' },
  { key: 'deportes', label: 'Deportes' },
  { key: 'tecnologia', label: 'Tecnología' },
]

export default function NoResults({ cityId, cityName, query, category }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateWith(updates: { q?: string | null; category?: string | null }) {
    const usp = new URLSearchParams(searchParams.toString())
    if (updates.q !== undefined) {
      if (updates.q) usp.set('q', updates.q)
      else usp.delete('q')
    }
    if (updates.category !== undefined) {
      if (updates.category) usp.set('category', updates.category)
      else usp.delete('category')
    }
    const queryString = usp.toString()
    router.push(`/eventos/${cityId}${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div data-testid="no-results" className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No encontramos resultados {query ? `para “${query}”` : ''}
      </h3>
      <p className="text-gray-600 max-w-xl mx-auto mb-6">
        {category && <span className="font-medium">Categoría: {category}. </span>}
        Prueba ajustando tu búsqueda o explora otras opciones en {cityName}.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
        <button
          onClick={() => navigateWith({ q: null })}
          className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Limpiar filtros
        </button>
        <button
          onClick={() => navigateWith({ q: null, category: null })}
          className="px-5 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Ver todos los eventos en {cityName}
        </button>
        <a
          href="/"
          className="px-5 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
        >
          Explorar otras ciudades
        </a>
      </div>

      <div className="mb-3 text-sm text-gray-500">O filtra por categoría</div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestedCategories.map(s => (
          <button
            key={s.key}
            onClick={() => navigateWith({ category: s.key })}
            className="px-3 py-1.5 rounded-full text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}


