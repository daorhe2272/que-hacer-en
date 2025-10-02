'use client'

import type { Event } from '@/types/event'
import { formatEventDate, formatEventTime, formatEventPrice } from '@/lib/events'
import { useSession } from '@/lib/session'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmationModal from './ConfirmationModal'

interface EventDetailsProps {
  event: Event
  cityName: string
  cityId: string
}

export default function EventDetails({ event, cityName, cityId }: EventDetailsProps) {
  const { isAuthenticated, user } = useSession()
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const manageMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const getAccessToken = useCallback(async (): Promise<string> => {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }, [])

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/favorites/${event.id}/status`, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
          'x-correlation-id': crypto.randomUUID()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setIsFavorited(data.isFavorited)
      }
    } catch (err) {
      console.error('Error checking favorite status:', err)
    }
  }, [event.id, getAccessToken])

  // Check if event is favorited on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      checkFavoriteStatus()
    }
  }, [isAuthenticated, user, checkFavoriteStatus])

  async function toggleFavorite() {
    if (!isAuthenticated || isLoading) return

    setIsLoading(true)
    try {
      const token = await getAccessToken()
      const method = isFavorited ? 'DELETE' : 'POST'
      const url = isFavorited
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/favorites/${event.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/users/favorites`

      const body = isFavorited ? undefined : JSON.stringify({ eventId: event.id })

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-correlation-id': crypto.randomUUID()
        },
        body
      })

      if (response.ok) {
        setIsFavorited(!isFavorited)
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if current user can manage the event (owner or admin)
  const canManageEvent = useCallback(() => {
    if (!isAuthenticated || !user) return false

    // Admin can manage any event
    if (user.role === 'admin') return true

    // Event creator can manage their own event
    if (event.created_by && user.id === event.created_by) return true

    return false
  }, [isAuthenticated, user, event.created_by])

  // Close manage menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setIsManageMenuOpen(false)
      }
    }

    if (isManageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isManageMenuOpen])

  // Handler for edit action
  const handleEditEvent = () => {
    setIsManageMenuOpen(false)
    router.push(`/editar-evento/${event.id}`)
  }

  // Delete event handlers
  const handleDeleteEvent = () => {
    setIsManageMenuOpen(false)
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!isAuthenticated || isDeletingEvent) return

    setIsDeletingEvent(true)
    setDeleteError(null)

    try {
      const token = await getAccessToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/uuid/${event.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-correlation-id': crypto.randomUUID()
        }
      })

      if (response.ok) {
        // Success - close modal and redirect
        setIsDeleteModalOpen(false)
        // Redirect to city events page
        router.push(`/eventos/${cityId}`)
      } else {
        // Handle different error status codes
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        let errorMessage = 'Error al eliminar el evento'

        switch (response.status) {
          case 401:
            errorMessage = 'No tienes autorización para realizar esta acción. Inicia sesión nuevamente.'
            break
          case 403:
            errorMessage = 'No tienes permisos para eliminar este evento'
            break
          case 404:
            errorMessage = 'El evento no fue encontrado'
            break
          case 500:
            errorMessage = 'Error del servidor. Inténtalo de nuevo más tarde'
            break
          default:
            errorMessage = errorData.error || 'Error al eliminar el evento'
        }

        setDeleteError(errorMessage)
      }
    } catch (err) {
      console.error('Error deleting event:', err)
      setDeleteError('Error de conexión. Verifica tu internet e inténtalo de nuevo')
    } finally {
      setIsDeletingEvent(false)
    }
  }

  const handleDeleteCancel = () => {
    if (isDeletingEvent) return
    setIsDeleteModalOpen(false)
    setDeleteError(null)
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-white/80 mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <Link href={`/eventos/${cityId}`} className="hover:text-white transition-colors">
            Eventos en {cityName}
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{event.title}</span>
        </nav>

        {/* Event Details Card */}
        <div className="bg-white rounded-xl shadow-card overflow-hidden mb-8">
          {/* Event Image */}
          <div className="relative h-64 md:h-96 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
            {event.image ? (
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <h1 className="text-2xl md:text-4xl font-bold mb-2">{event.title}</h1>
                  <div className="text-lg opacity-90">{event.location}</div>
                </div>
              </div>
            )}

            {/* Category Badge */}
            <div className="absolute top-6 left-6">
              <span className="inline-block px-4 py-2 bg-primary-700 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                {event.category}
              </span>
            </div>

            {/* Action Buttons - Favorite and Manage */}
            {isAuthenticated && (
              <div className="absolute top-6 right-6 flex items-center space-x-3">
                {/* Favorite Button */}
                <button
                  onClick={toggleFavorite}
                  disabled={isLoading}
                  className={`p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                    isFavorited
                      ? 'bg-red-500 text-white'
                      : 'bg-white/80 text-gray-600 hover:bg-white/90'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={isFavorited ? 'Remover de favoritos' : 'Agregar a favoritos'}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isFavorited ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>

                {/* Event Management Dropdown - Only for owners/admins */}
                {canManageEvent() && (
                  <div className="relative" ref={manageMenuRef}>
                    <button
                      onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                      className="p-3 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/90 text-gray-600"
                      aria-label="Gestionar evento"
                      aria-expanded={isManageMenuOpen}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isManageMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          onClick={handleEditEvent}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center space-x-2 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Editar evento</span>
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={handleDeleteEvent}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Eliminar evento</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Content */}
          <div className="p-6 md:p-8">
            {/* Title and Price */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
              <div className="flex-1 mb-4 md:mb-0 md:pr-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                  {event.title}
                </h1>
                <div className="flex items-center text-lg font-medium text-accent-500 mb-2">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {formatEventDate(event.utcTimestamp)} • {formatEventTime(event.utcTimestamp)}
                </div>
                <div className="flex items-center text-gray-600 mb-4">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-medium">{event.location}</div>
                    {event.address && <div className="text-sm text-gray-500">{event.address}</div>}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {formatEventPrice(event.price, event.currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Descripción</h2>
              <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles del evento</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-gray-600 font-medium w-24">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'active' ? 'bg-green-100 text-green-800' :
                      event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      event.status === 'postponed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status === 'active' ? 'Activo' :
                       event.status === 'cancelled' ? 'Cancelado' :
                       event.status === 'postponed' ? 'Pospuesto' :
                       'Agotado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {event.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Etiquetas</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/eventos/${cityId}`}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-center"
              >
                Ver más eventos en {cityName}
              </Link>
              <button
                onClick={() => window.history.back()}
                className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-8 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-w-[120px]"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeletingEvent}
          title="Eliminar evento"
          message={`¿Estás seguro de que quieres eliminar "${event.title}"? Esta acción no se puede deshacer y el evento será eliminado permanentemente.`}
          confirmText="Eliminar evento"
          cancelText="Cancelar"
          confirmButtonStyle="danger"
        />

        {/* Error Display */}
        {deleteError && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {deleteError}
                </p>
                <button
                  onClick={() => setDeleteError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}