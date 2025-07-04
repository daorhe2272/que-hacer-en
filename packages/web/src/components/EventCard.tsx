import type { Event } from '@/types/event'
import { formatEventDate, formatEventPrice } from '@/lib/events'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out overflow-hidden group hover:-translate-y-1 animate-fadeIn">
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