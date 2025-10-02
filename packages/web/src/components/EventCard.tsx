'use client'

import type { Event } from '@/types/event'
import { formatEventDate, formatEventTime, formatEventPrice } from '@/lib/events'
import { useSession } from '@/lib/session'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmationModal from './ConfirmationModal'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
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

  // Handle edit event navigation
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
        // Success - close modal and refresh the page
        setIsDeleteModalOpen(false)
        router.refresh()
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

  const deleteMessage = `¿Estás seguro de que quieres eliminar "${event.title}"? Esta acción no se puede deshacer y el evento será eliminado permanentemente.`

  return (
    <div data-testid="event-card" data-price={event.price} className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden group hover:-translate-y-1 animate-fadeIn">
      {/* Event Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white p-4">
              <div className="text-sm opacity-90">{event.location}</div>
            </div>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-block px-3 py-1 bg-primary-700 text-white rounded-full text-xs font-medium backdrop-blur-sm">
            {event.category}
          </span>
        </div>

        {/* Action Buttons - Favorite and Manage */}
        <div className="absolute top-3 right-3 flex items-center space-x-3">
          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isAuthenticated) {
                router.push('/login')
                return
              }
              toggleFavorite()
            }}
            disabled={isLoading}
            className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
              isFavorited
                ? 'bg-red-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={isAuthenticated ? (isFavorited ? 'Remover de favoritos' : 'Agregar a favoritos') : 'Inicia sesión para agregar a favoritos'}
          >
            <svg
              className="w-4 h-4"
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
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsManageMenuOpen(!isManageMenuOpen)
                  }}
                  className="p-2 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/90 text-gray-600"
                  aria-label="Gestionar evento"
                  aria-expanded={isManageMenuOpen}
                >
                  <svg
                    className="w-4 h-4"
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
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleEditEvent()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center space-x-2 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar evento</span>
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteEvent()
                      }}
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
      </div>

      {/* Event Content */}
      <div className="p-6">
        {/* Date & Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-accent-500">
            {formatEventDate(event.utcTimestamp)}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatEventPrice(event.price, event.currency)}
          </span>
        </div>

        {/* Event Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>

        {/* Event Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {formatEventDate(event.utcTimestamp)} • {formatEventTime(event.utcTimestamp)}
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
          {event.tags.length > 3 && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              +{event.tags.length - 3}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Link
          href={`/eventos/${event.city}/${event.id}`}
          className="block w-full bg-primary-50 hover:bg-primary-100 text-primary-800 py-3 px-4 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-center"
        >
          Ver detalles
        </Link>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeletingEvent}
          title="Eliminar evento"
          message={deleteMessage}
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