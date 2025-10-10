'use client'

import { useState, useEffect, useCallback } from 'react'
import EventCard from '@/components/EventCard'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { Event } from '@/types/event'

export default function FavoritosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  const [favorites, setFavorites] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      const { getUserFavorites } = await import('@/lib/api')
      const result = await getUserFavorites()
      setFavorites(result.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!sessionLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/favoritos')
        return
      }
      fetchFavorites()
    }
  }, [isAuthenticated, sessionLoading, router, fetchFavorites])

  if (sessionLoading || loading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
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
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
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
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      <div className="container mx-auto px-4 py-12 relative z-10">
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
                onClick={() => router.push('/')}
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