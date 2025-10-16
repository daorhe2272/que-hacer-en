import { CATEGORIES } from '@que-hacer-en/shared'

export type ValidationResult = {
  isValid: boolean
  errors: Record<string, string>
}

export type EventFormData = {
  title: string
  description: string
  date: string
  time: string
  location: string
  address: string
  category: string
  city: string
  price: number | null  // null means unknown/undefined, 0 means free
  currency: string
  image?: string
  organizer: string
  capacity: number | null  // null means unknown, 0 means unlimited, >0 means limited
  tags: string[]
}

const CITIES = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'] as const
const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug).filter(s => s !== 'todos')

export function validateEventForm(data: Partial<EventFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  // Title validation
  if (!data.title?.trim()) {
    errors.title = 'El título es requerido'
  } else if (data.title.trim().length < 3) {
    errors.title = 'El título debe tener al menos 3 caracteres'
  } else if (data.title.trim().length > 200) {
    errors.title = 'El título no puede exceder 200 caracteres'
  }

  // Description validation
  if (!data.description?.trim()) {
    errors.description = 'La descripción es requerida'
  } else if (data.description.trim().length < 10) {
    errors.description = 'La descripción debe tener al menos 10 caracteres'
  } else if (data.description.trim().length > 2000) {
    errors.description = 'La descripción no puede exceder 2000 caracteres'
  }

  // Date validation
  if (!data.date?.trim()) {
    errors.date = 'La fecha es requerida'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.date = 'La fecha debe tener el formato YYYY-MM-DD'
  } else {
    const date = new Date(data.date + 'T00:00:00')
    if (isNaN(date.getTime())) {
      errors.date = 'La fecha no es válida'
    }
  }

  // Time validation
  if (!data.time?.trim()) {
    errors.time = 'La hora es requerida'
  } else if (!/^\d{2}:\d{2}$/.test(data.time)) {
    errors.time = 'La hora debe tener el formato HH:MM'
  }

  // Location validation
  if (!data.location?.trim()) {
    errors.location = 'La ubicación es requerida'
  } else if (data.location.trim().length < 2) {
    errors.location = 'La ubicación debe tener al menos 2 caracteres'
  } else if (data.location.trim().length > 200) {
    errors.location = 'La ubicación no puede exceder 200 caracteres'
  }

  // Address validation
  if (!data.address?.trim()) {
    errors.address = 'La dirección es requerida'
  } else if (data.address.trim().length < 2) {
    errors.address = 'La dirección debe tener al menos 2 caracteres'
  } else if (data.address.trim().length > 200) {
    errors.address = 'La dirección no puede exceder 200 caracteres'
  }

  // Category validation
  if (!data.category?.trim()) {
    errors.category = 'La categoría es requerida'
  } else if (!CATEGORY_SLUGS.includes(data.category)) {
    errors.category = 'Categoría no válida'
  }

  // City validation
  if (!data.city?.trim()) {
    errors.city = 'La ciudad es requerida'
  } else if (!CITIES.includes(data.city as typeof CITIES[number])) {
    errors.city = 'Ciudad no válida'
  }

  // Price validation (optional - can be null, 0, or positive number)
  if (data.price !== null && data.price !== undefined) {
    if (typeof data.price !== 'number') {
      errors.price = 'El precio debe ser un número'
    } else if (data.price < 0) {
      errors.price = 'El precio no puede ser negativo'
    }
  }

  // Currency validation
  if (!data.currency?.trim()) {
    errors.currency = 'La moneda es requerida'
  } else if (data.currency.length !== 3) {
    errors.currency = 'La moneda debe ser un código de 3 caracteres'
  }

  // Image validation (optional)
  if (data.image?.trim()) {
    try {
      new URL(data.image)
    } catch {
      errors.image = 'La imagen debe ser una URL válida'
    }
  }



  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export function validateField(field: keyof EventFormData, value: string | number | string[] | null, allData?: Partial<EventFormData>): string | undefined {
  const testData = { ...allData, [field]: value }
  const result = validateEventForm(testData)
  return result.errors[field]
}