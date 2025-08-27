'use client'

import { useSession } from '@/lib/session'
import { useState, useEffect } from 'react'
import EventCard from '@/components/EventCard'
import { Event } from '@/types/event'
import { useRouter } from 'next/navigation'

export default function FavoritosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  const [favorites, setFavorites] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/favoritos')
        return
      }
      fetchFavorites()
    }
  }, [isAuthenticated, sessionLoading, router])

  async function fetchFavorites() {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        router.push('/login?redirect=/favoritos')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-correlation-id': crypto.randomUUID()
        }
      })

      if (!response.ok) {
        throw new Error('Error al cargar favoritos')
      }

      const data_response = await response.json()
      setFavorites(data_response.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-white mt-4">Cargando favoritos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-white text-lg mb-4">❌ {error}</p>
            <button 
              onClick={fetchFavorites}
              className="bg-white text-purple-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Mis Favoritos
          </h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            Todos tus eventos favoritos en un solo lugar
          </p>
        </div>

        {/* Favorites Grid */}
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-2xl">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No tienes favoritos aún
              </h3>
              <p className="text-gray-600 mb-6">
                Explora eventos y marca tus favoritos haciendo clic en el corazón
              </p>
              <button 
                onClick={() => router.push('/eventos/bogota')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explorar Eventos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}