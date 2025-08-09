'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function useCityQueryNavigation(cityId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateWithParams(params: { q?: string; category?: string }) {
    const usp = new URLSearchParams(searchParams.toString())
    if (params.q !== undefined) {
      if (params.q) usp.set('q', params.q)
      else usp.delete('q')
    }
    if (params.category !== undefined) {
      if (params.category && params.category !== 'todos') usp.set('category', params.category)
      else usp.delete('category')
    }
    const query = usp.toString()
    router.push(`/eventos/${cityId}${query ? `?${query}` : ''}`)
  }

  return { navigateWithParams }
}


