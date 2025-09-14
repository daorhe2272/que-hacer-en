// Utilidades de formato usadas por el frontend

export function formatEventDate(utcTimestamp: string): string {
  // Convert UTC timestamp to Colombian time for display
  const date = new Date(utcTimestamp)
  return date.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export function formatEventTime(utcTimestamp: string): string {
  // Convert UTC timestamp to Colombian time for display
  const date = new Date(utcTimestamp)
  return date.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatEventPrice(price: number | null, currency: string): string {
  if (price === null) {
    return 'Precio desconocido'
  }
  
  if (price === 0) {
    return 'Gratis'
  }
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency
  }).format(price)
} 