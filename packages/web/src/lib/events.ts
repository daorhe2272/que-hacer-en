// Utilidades de formato usadas por el frontend

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