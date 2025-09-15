'use client'

import { useSession } from '@/lib/session'
import { useState, useEffect, useCallback } from 'react'
import EventCard from '@/components/EventCard'
import { Event } from '@/types/event'
import { useRouter } from 'next/navigation'

export default function MisEventosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserEvents = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      const { getUserEvents } = await import('@/lib/api')
      const result = await getUserEvents()
      setEvents(result.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!sessionLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/mis-eventos')
        return
      }
      fetchUserEvents()
    }
  }, [isAuthenticated, sessionLoading, router, fetchUserEvents])

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
            <p className="text-white mt-4">Cargando mis eventos...</p>
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
              onClick={fetchUserEvents}
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
            Mis Eventos
          </h1>
          <p className="text-xl text-orange-400 font-bold max-w-2xl mx-auto">
            Todos los eventos que has creado
          </p>
        </div>

        {/* Events Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-2xl">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No has creado eventos aún
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer evento y aparecerá aquí
              </p>
              <button
                onClick={() => router.push('/crear-evento')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Crear Evento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}