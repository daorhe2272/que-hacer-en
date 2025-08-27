'use client'

import type { Event } from '@/types/event'
import { formatEventDate, formatEventPrice } from '@/lib/events'
import { useSession } from '@/lib/session'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const { isAuthenticated, user } = useSession()
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if event is favorited on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      checkFavoriteStatus()
    }
  }, [isAuthenticated, user, event.id])

  async function checkFavoriteStatus() {
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
  }

  async function getAccessToken(): Promise<string> {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

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

  return (
    <div data-testid="event-card" data-price={event.price} className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden group hover:-translate-y-1 animate-fadeIn">
            {/* Event Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover"
            priority={false}
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

        {/* Favorite Button */}
        {isAuthenticated && (
          <div className="absolute top-3 right-3">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleFavorite()
              }}
              disabled={isLoading}
              className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                isFavorited 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 text-gray-600 hover:bg-white/90'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={isFavorited ? 'Remover de favoritos' : 'Agregar a favoritos'}
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
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-6">
        {/* Date & Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-accent-500">
            {formatEventDate(event.date)}
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
            {formatEventDate(event.date)} • {event.time}
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
        <button className="w-full bg-primary-50 hover:bg-primary-100 text-primary-800 py-3 px-4 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          Ver detalles
        </button>
      </div>
    </div>
  )
} 