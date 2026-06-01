'use client'

import CategoryFilters from '@/components/CategoryFilters'
import { useRouter, useSearchParams } from 'next/navigation'
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@/lib/date-range-utils'

type Props = { city: string; selectedCategory: string; selectedRange: string }

export default function ClientFilters({ city, selectedCategory, selectedRange }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateWithParams(params: { category?: string; dateRange?: string }) {
    const usp = new URLSearchParams(searchParams.toString())
    if (params.category !== undefined) {
      if (params.category && params.category !== 'todos') usp.set('category', params.category)
      else usp.delete('category')
    }
    if (params.dateRange !== undefined) {
      if (params.dateRange) usp.set('dateRange', params.dateRange)
      else usp.delete('dateRange')
    }
    usp.delete('page')
    const query = usp.toString()
    router.push(`/eventos/${city}${query ? `?${query}` : ''}`)
  }

  function handleRangeClick(key: DateRangePreset) {
    navigateWithParams({ dateRange: selectedRange === key ? '' : key })
  }

  return (
    <div>
      {/* Date range filter */}
      <div>
        <span className="text-base font-semibold text-gray-900">Filtrar por fecha</span>
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {DATE_RANGE_PRESETS.map(({ key, label }) => {
            const isActive = selectedRange === key
            return (
              <button
                key={key}
                onClick={() => handleRangeClick(key)}
                className={`
                  flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out
                  ${isActive
                    ? 'bg-primary-100 text-primary-600 border border-primary-600'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-900'
                  }
                `}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="mt-4">
        <span className="text-base font-semibold text-gray-900">Categorías</span>
        <CategoryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={(newCategory) => navigateWithParams({ category: newCategory })}
        />
      </div>
    </div>
  )
}