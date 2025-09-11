'use client'

import { useSession } from '@/lib/session'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createEvent, type EventFormData } from '@/lib/api'
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

export default function CrearEventoPage() {
  const router = useRouter()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  
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
    organizer: '',
    capacity: null,  // Start with unknown capacity
    tags: [],
    status: 'active'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/crear-evento')}`)
    }
  }, [isAuthenticated, sessionLoading, router])
  
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
      const result = await createEvent(formData)
      
      if (result.success) {
        setSubmitSuccess(true)
        // Redirect to event management or home after 2 seconds
        setTimeout(() => {
          router.push('/')
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
        setSubmitError(result.error || 'Error al crear el evento')
      }
    } catch (error) {
      setSubmitError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (sessionLoading) {
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
              <p className="text-gray-600 mt-4">Verificando permisos...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Evento creado exitosamente!</h1>
            <p className="text-gray-600 mb-6">Tu evento ha sido publicado y estará disponible para todos los usuarios.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Crear Nuevo Evento</h1>
          
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

            {/* Price and Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onChange={() => handleFieldChange('price', 1000)}
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
                        const value = parseFloat(e.target.value) || 1000
                        handleFieldChange('price', Math.max(1000, value))
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="1000"
                      min="1000"
                      step="1000"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">Monto en pesos colombianos (COP)</p>
                  </div>
                )}

                {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacidad
                </label>
                
                {/* Capacity type selection */}
                <div className="space-y-3 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="capacityType"
                      checked={formData.capacity === null}
                      onChange={() => handleFieldChange('capacity', null)}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Desconocido</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="capacityType"
                      checked={formData.capacity === 0}
                      onChange={() => handleFieldChange('capacity', 0)}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Sin límite</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="capacityType"
                      checked={typeof formData.capacity === 'number' && formData.capacity > 0}
                      onChange={() => handleFieldChange('capacity', 50)}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Capacidad limitada</span>
                  </label>
                </div>

                {/* Capacity input - only show when "Capacidad limitada" is selected */}
                {typeof formData.capacity === 'number' && formData.capacity > 0 && (
                  <div>
                    <input 
                      type="number" 
                      value={formData.capacity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 50
                        handleFieldChange('capacity', Math.max(1, value))
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.capacity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="50"
                      min="1"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">Número máximo de asistentes</p>
                  </div>
                )}

                {errors.capacity && <p className="text-red-600 text-xs mt-1">{errors.capacity}</p>}
              </div>
            </div>

            {/* Organizer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organizador *
              </label>
              <input 
                type="text" 
                value={formData.organizer}
                onChange={(e) => handleFieldChange('organizer', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.organizer ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Nombre del organizador"
                disabled={isSubmitting}
              />
              {errors.organizer && <p className="text-red-600 text-xs mt-1">{errors.organizer}</p>}
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
                    Creando evento...
                  </div>
                ) : (
                  'Crear Evento'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}