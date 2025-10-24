'use client'

import { useSession } from '@/lib/session'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { updateEvent, fetchEventForEdit, type EventFormData } from '@/lib/api'
import { validateEventForm, validateField } from '@/lib/validation'
import { CATEGORIES } from '@que-hacer-en/shared'
import TimePicker from '@/components/TimePicker'

const CITIES = [
  { value: 'bogota', label: 'Bogotá' },
  { value: 'medellin', label: 'Medellín' },
  { value: 'cali', label: 'Cali' },
  { value: 'barranquilla', label: 'Barranquilla' },
  { value: 'cartagena', label: 'Cartagena' }
] as const

const AVAILABLE_CATEGORIES = CATEGORIES.filter(c => c.slug !== 'todos')

export default function EditarEventoPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  const eventId = params.id as string

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    address: '',
    category: '',
    city: '',
    price: null,  // Start with unknown price
    currency: 'COP',
    image: '',
    tags: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [eventNotFound, setEventNotFound] = useState(false)

  // Function to convert UTC timestamp to Colombian timezone date/time
  const convertTimestampToFormFields = (utcTimestamp: string) => {
    const date = new Date(utcTimestamp)
    // Convert to Colombian timezone
    const colombianDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }))

    const dateStr = colombianDate.toISOString().split('T')[0] // YYYY-MM-DD
    const timeStr = colombianDate.toTimeString().slice(0, 5) // HH:MM

    return { date: dateStr, time: timeStr }
  }

  const fetchEventData = useCallback(async () => {
    try {
      setIsLoadingEvent(true)
      const event = await fetchEventForEdit(eventId)

      if (!event) {
        setEventNotFound(true)
        return
      }

      // Convert event data to form data
      const { date, time } = convertTimestampToFormFields(event.utcTimestamp)

      // Map category label to slug (case-insensitive)
      const categorySlug = AVAILABLE_CATEGORIES.find(cat => cat.label.toLowerCase() === event.category.toLowerCase())?.slug || AVAILABLE_CATEGORIES.find(cat => cat.slug === event.category)?.slug || event.category

      setFormData({
        title: event.title,
        description: event.description,
        date,
        time,
        location: event.location,
        address: event.address || '',
        category: categorySlug,
        city: event.city,
        price: event.price,
        currency: event.currency,
        image: event.image || '',
        tags: event.tags
      })
    } catch (err) {
      console.error('Error fetching event:', err)
      setSubmitError('Error al cargar el evento')
    } finally {
      setIsLoadingEvent(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/editar-evento/${eventId}`)}`)
      return
    }

    if (isAuthenticated && eventId) {
      fetchEventData()
    }
  }, [isAuthenticated, sessionLoading, router, eventId, fetchEventData])

  const handleFieldChange = (field: keyof EventFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Real-time validation
    const error = validateField(field, value, formData)
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    }

    // Check for image URL warnings
    if (field === 'image' && typeof value === 'string' && value.trim()) {
      try {
        const url = new URL(value)
        const pathname = url.pathname.toLowerCase()
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?(\#.*)?$/.test(pathname)
        if (!isImage) {
          setWarnings(prev => ({ ...prev, image: 'Es muy posible que este link no sea una imagen válida' }))
        } else {
          setWarnings(prev => ({ ...prev, image: '' }))
        }
      } catch {
        // Invalid URL, but that's handled by validation
        setWarnings(prev => ({ ...prev, image: '' }))
      }
    } else if (field === 'image') {
      setWarnings(prev => ({ ...prev, image: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate entire form
    const validation = validateEventForm(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await updateEvent(eventId, formData)

      if (result.success) {
        setSubmitSuccess(true)
        // Redirect to event details after 2 seconds
        setTimeout(() => {
          router.push(`/eventos/${formData.city}/${eventId}`)
        }, 2000)
      } else {
        if (result.validationErrors) {
          // Handle server validation errors
          const serverErrors: Record<string, string> = {}
          Object.entries(result.validationErrors).forEach(([field, fieldErrors]) => {
            serverErrors[field] = fieldErrors[0] || 'Error de validación'
          })
          setErrors(serverErrors)
        }
        setSubmitError(result.error || 'Error al actualizar el evento')
      }
    } catch (error) {
      setSubmitError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (sessionLoading || isLoadingEvent) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-80 min-h-full"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-600 mt-4">Cargando evento...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Show not found error
  if (eventNotFound) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-80 min-h-full"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Evento no encontrado</h1>
            <p className="text-gray-600 mb-6">El evento que intentas editar no existe o no tienes permisos para editarlo.</p>
            <button
              onClick={() => router.push('/mis-eventos')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Volver a mis eventos
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show success message
  if (submitSuccess) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient opacity-80 min-h-full"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Evento actualizado exitosamente!</h1>
            <p className="text-gray-600 mb-6">Los cambios han sido guardados y el evento está actualizado.</p>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
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
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80 min-h-full"></div>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Editar Evento</h1>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del evento *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: Concierto de música en vivo"
                disabled={isSubmitting}
              />
              {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Describe tu evento en detalle..."
                disabled={isSubmitting}
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora *
                </label>
                <TimePicker
                  value={formData.time}
                  onChange={(time) => handleFieldChange('time', time)}
                  disabled={isSubmitting}
                  error={!!errors.time}
                />
                {errors.time && <p className="text-red-600 text-xs mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Location and Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: Teatro Nacional"
                disabled={isSubmitting}
              />
              {errors.location && <p className="text-red-600 text-xs mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: Carrera 7 #22-47"
                disabled={isSubmitting}
              />
              {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
            </div>

            {/* Category and City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Seleccionar categoría</option>
                  {AVAILABLE_CATEGORIES.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Seleccionar ciudad</option>
                  {CITIES.map(city => (
                    <option key={city.value} value={city.value}>{city.label}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio
              </label>

              {/* Price type selection */}
              <div className="space-y-3 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priceType"
                    checked={formData.price === null}
                    onChange={() => handleFieldChange('price', null)}
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Precio desconocido</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priceType"
                    checked={formData.price === 0}
                    onChange={() => handleFieldChange('price', 0)}
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">Gratuito</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priceType"
                    checked={typeof formData.price === 'number' && formData.price > 0}
                    onChange={() => handleFieldChange('price', 1)}
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">De pago</span>
                </label>
              </div>

              {/* Price input - only show when "De pago" is selected */}
              {typeof formData.price === 'number' && formData.price > 0 && (
                <div>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleFieldChange('price', Math.max(0, value))
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0"
                    min="0"
                    step="1000"
                    disabled={isSubmitting}
                  />
                  {formData.price && formData.price > 0 && (
                    <p className="text-sm font-medium text-purple-600 mt-1 ml-4">
                      ${formData.price.toLocaleString('es-CO', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })} COP
                    </p>
                  )}
                </div>
              )}

              {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
            </div>


            {/* Image URL (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen (URL)
              </label>
              <input
                type="url"
                value={formData.image || ''}
                onChange={(e) => handleFieldChange('image', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.image ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="https://ejemplo.com/imagen.jpg"
                disabled={isSubmitting}
              />
              {errors.image && <p className="text-red-600 text-xs mt-1">{errors.image}</p>}
              {warnings.image && <p className="text-yellow-600 text-xs mt-1">{warnings.image}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white transition duration-200`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Actualizando evento...
                  </div>
                ) : (
                  'Actualizar Evento'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}