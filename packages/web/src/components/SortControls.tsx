'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

type Props = {
  city: string
  sort?: 'date' | 'price'
  order?: 'asc' | 'desc'
}

export default function SortControls({ city, sort, order }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentSort, setCurrentSort] = useState<"date" | "price" | undefined>(sort)
  const [currentOrder, setCurrentOrder] = useState<"asc" | "desc" | undefined>(order)

  function update(params: { sort?: 'date' | 'price'; order?: 'asc' | 'desc' }) {
    const usp = new URLSearchParams(searchParams.toString())
    const nextSort = params.sort ?? currentSort ?? undefined
    const nextOrder = params.order ?? currentOrder ?? undefined
    if (nextSort) usp.set('sort', nextSort)
    else usp.delete('sort')
    if (nextOrder) usp.set('order', nextOrder)
    else usp.delete('order')
    // reset page when changing sort/order
    usp.delete('page')
    setCurrentSort(nextSort)
    setCurrentOrder(nextOrder)
    const query = usp.toString()
    router.push(`/eventos/${city}${query ? `?${query}` : ''}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Ordenar por</label>
      <select
        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        aria-label="Orden: campo"
        value={currentSort || ''}
        onChange={e => update({ sort: (e.target.value as 'date' | 'price') || undefined })}
      >
        <option value="">Relevancia</option>
        <option value="date">Fecha</option>
        <option value="price">Precio</option>
      </select>
      <select
        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        aria-label="Orden: dirección"
        value={currentOrder || 'asc'}
        onChange={e => update({ order: e.target.value as 'asc' | 'desc' })}
      >
        <option value="asc">Ascendente</option>
        <option value="desc">Descendente</option>
      </select>
    </div>
  )
}


