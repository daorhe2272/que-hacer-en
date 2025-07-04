import type { Event, EventsData, CityKey } from '@/types/event'

// Import the events data from local data directory
// In a real app, this would be an API call
import eventsData from '../data/events.json'

const events = eventsData as EventsData

export function getEventsByCity(city: CityKey): Event[] {
  return events[city] || []
}

export function getAllEvents(): Event[] {
  return [
    ...events.bogota,
    ...events.medellin,
    ...events.cali,
    ...events.barranquilla
  ]
}

export function getEventById(id: string): Event | undefined {
  const allEvents = getAllEvents()
  return allEvents.find(event => event.id === id)
}

export function getEventsByCategory(category: string): Event[] {
  const allEvents = getAllEvents()
  return allEvents.filter(event => 
    event.category.toLowerCase() === category.toLowerCase()
  )
}

export function getUpcomingEvents(city?: CityKey): Event[] {
  const now = new Date()
  const cityEvents = city ? getEventsByCity(city) : getAllEvents()
  
  return cityEvents
    .filter(event => new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export function formatEventPrice(price: number, currency: string): string {
  if (price === 0) {
    return 'Gratis'
  }
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency
  }).format(price)
} 