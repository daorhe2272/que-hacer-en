'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DEFAULT_PAGE_LIMIT, PAGE_LIMIT_OPTIONS } from '@/constants'

type Props = {
  city: string
  limit?: number
}

export default function PageSizeSelector({ city, limit }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function update(nextLimit: number) {
    const usp = new URLSearchParams(searchParams.toString())
    usp.set('limit', String(nextLimit))
    // reset page cuando cambia el tamaño
    usp.delete('page')
    const query = usp.toString()
    router.push(`/eventos/${city}${query ? `?${query}` : ''}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Eventos por página</label>
      <select
        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        aria-label="Eventos por página"
        value={limit || DEFAULT_PAGE_LIMIT}
        onChange={e => update(Number(e.target.value))}
      >
        {PAGE_LIMIT_OPTIONS.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  )
}


