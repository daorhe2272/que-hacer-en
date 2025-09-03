import Link from 'next/link'

type Props = {
  city: string
  page: number
  totalPages: number
  q?: string
  category?: string
  sort?: 'date' | 'price'
  order?: 'asc' | 'desc'
  limit?: number
}

export default function Pagination({ city, page, totalPages, q, category, sort, order, limit }: Props) {
  if (totalPages <= 1) return null

  function buildHref(nextPage: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    if (order) params.set('order', order)
    if (limit) params.set('limit', limit.toString())
    params.set('page', nextPage.toString())
    
    return `/eventos/${city}?${params.toString()}`
  }

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  return (
    <div className="flex items-center justify-center gap-3">
      <Link
        aria-disabled={!prevPage}
        className={`px-3 py-2 rounded border text-sm ${prevPage ? 'text-gray-700 hover:bg-gray-50 border-gray-200' : 'text-gray-400 border-gray-100 pointer-events-none'}`}
        href={prevPage ? buildHref(prevPage) : `/eventos/${city}`}
      >
        Anterior
      </Link>
      <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
      <Link
        aria-disabled={!nextPage}
        className={`px-3 py-2 rounded border text-sm ${nextPage ? 'text-gray-700 hover:bg-gray-50 border-gray-200' : 'text-gray-400 border-gray-100 pointer-events-none'}`}
        href={nextPage ? buildHref(nextPage) : `/eventos/${city}`}
      >
        Siguiente
      </Link>
    </div>
  )
}


