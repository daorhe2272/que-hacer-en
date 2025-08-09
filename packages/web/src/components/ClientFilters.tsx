'use client'

import CategoryFilters from '@/components/CategoryFilters'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = { city: string; selectedCategory: string }

export default function ClientFilters({ city, selectedCategory }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateWithParams(params: { category?: string }) {
    const usp = new URLSearchParams(searchParams.toString())
    if (params.category !== undefined) {
      if (params.category && params.category !== 'todos') usp.set('category', params.category)
      else usp.delete('category')
    }
    // reset page when filters change
    usp.delete('page')
    const query = usp.toString()
    router.push(`/eventos/${city}${query ? `?${query}` : ''}`)
  }

  return (
    <CategoryFilters 
      selectedCategory={selectedCategory}
      onCategoryChange={(newCategory) => navigateWithParams({ category: newCategory })}
    />
  )
}


