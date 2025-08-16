'use client'

import { useState } from 'react'
import { CATEGORIES } from '@que-hacer-en/shared'

const categories = CATEGORIES.map(c => ({ key: c.slug, label: c.label }))

interface CategoryFiltersProps {
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
}

export default function CategoryFilters({ 
  selectedCategory = 'todos', 
  onCategoryChange 
}: CategoryFiltersProps) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory)

  const handleCategoryClick = (categoryKey: string) => {
    setActiveCategory(categoryKey)
    onCategoryChange?.(categoryKey)
  }

  return (
    <div className="flex items-center gap-4 py-6 overflow-x-auto scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.key}
          onClick={() => handleCategoryClick(category.key)}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out
            ${activeCategory === category.key
              ? 'bg-primary-600 text-white'
              : 'bg-transparent text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
        >
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  )
} 