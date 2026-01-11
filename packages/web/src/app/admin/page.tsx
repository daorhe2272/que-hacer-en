"use client"

import { getAdminStats, getCities, getInactiveEvents, deleteEvent, updateEvent, type City } from '@/lib/api'
import { CATEGORIES } from '@que-hacer-en/shared'
import type { Event } from '@/types/event'
import ConfirmationModal from '@/components/ConfirmationModal'
import DataSourcesTab from '@/components/DataSourcesTab'
import { useState, useEffect, useCallback } from 'react'
export const dynamic = 'force-dynamic'

type TabType = 'dashboard' | 'users' | 'events' | 'data-sources' | 'analytics' | 'settings'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Panel', icon: '📊' },
    { id: 'users' as TabType, label: 'Usuarios', icon: '👥' },
    { id: 'events' as TabType, label: 'Eventos', icon: '📅' },
    { id: 'data-sources' as TabType, label: 'Fuentes de Datos', icon: '🔗' },
    { id: 'analytics' as TabType, label: 'Análisis', icon: '📈' },
    { id: 'settings' as TabType, label: 'Configuración', icon: '⚙️' },
  ]

  return (
    <div
      className="min-h-screen relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      {/* Header */}
      <header className="relative z-10 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-primary-800">Panel de Administración</h1>
            <div className="flex items-center space-x-4">
              <span className="text-base font-bold text-accent-400">Bienvenido, Admin</span>
              <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex flex-wrap gap-1 bg-white p-1 rounded-lg shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 sm:px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'data-sources' && <DataSourcesTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}

function DashboardTab() {
  const [stats, setStats] = useState({ totalUsers: 0, activeEvents: 0, pendingReviews: 0, lastMiningTime: null as string | null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats()
        setStats(data as { totalUsers: number; activeEvents: number; pendingReviews: number; lastMiningTime: string | null })
        setError(null)
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Resumen del Panel</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {loading ? '...' : stats.totalUsers.toLocaleString()}
          </div>
          <div className="text-sm text-blue-600">Total de Usuarios</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {loading ? '...' : stats.activeEvents.toLocaleString()}
          </div>
          <div className="text-sm text-green-600">Eventos Activos</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {loading ? '...' : stats.pendingReviews.toLocaleString()}
          </div>
          <div className="text-sm text-yellow-600">Revisiones Pendientes</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '...' : stats.lastMiningTime ? new Date(stats.lastMiningTime).toLocaleString('es-CO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Nunca'}
          </div>
          <div className="text-sm text-purple-600">Último Trabajo de Minería</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Actividad Reciente</h3>
          <div className="space-y-2">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-blue-500 mr-3">👤</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Nuevo usuario registrado</div>
                <div className="text-xs text-gray-500">john@example.com • hace 2 min</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-green-500 mr-3">📅</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Evento enviado para revisión</div>
                <div className="text-xs text-gray-500">&ldquo;Festival de Música de Verano&rdquo; • hace 15 min</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-purple-500 mr-3">🔗</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Trabajo de minería completado</div>
                <div className="text-xs text-gray-500">123 eventos procesados • hace 1 hora</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <div className="text-sm font-medium">Revisar Eventos</div>
              <div className="text-xs opacity-90">
                {loading ? '...' : `${stats.pendingReviews.toLocaleString()} pendientes`}
              </div>
            </button>
            <button className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <div className="text-sm font-medium">Gestionar Usuarios</div>
              <div className="text-xs opacity-90">
                {loading ? '...' : `${stats.totalUsers.toLocaleString()} total`}
              </div>
            </button>
            <button className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <div className="text-sm font-medium">Ejecutar Minería</div>
              <div className="text-xs opacity-90">
                Último: {loading ? '...' : stats.lastMiningTime ? new Date(stats.lastMiningTime).toLocaleString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Nunca'}
              </div>
            </button>
            <button className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              <div className="text-sm font-medium">Ver Reportes</div>
              <div className="text-xs opacity-90">Análisis</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Agregar Nuevo Usuario
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar usuarios..."
          className="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-64"
        />
        <select className="px-3 py-2 border border-gray-300 rounded-lg">
          <option>Todos los Roles</option>
          <option>Asistente</option>
          <option>Organizador</option>
          <option>Admin</option>
        </select>
        <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
          Filtrar
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unido</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                    J
                  </div>
                  <div>
                    <div className="text-sm font-medium">john@example.com</div>
                    <div className="text-xs text-gray-500">John Doe</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Organizer</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">2024-01-15</td>
              <td className="px-4 py-3">
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Desactivar</button>
                </div>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-medium">admin@example.com</div>
                    <div className="text-xs text-gray-500">Admin User</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Admin</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">2023-12-01</td>
              <td className="px-4 py-3">
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                  <button className="text-gray-600 hover:text-gray-800 text-sm">Ver Registros</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Mostrando 2 de 1,234 usuarios
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Anterior</button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Siguiente</button>
        </div>
      </div>
    </div>
  )
}

function EventsTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<{
    title: string
    description: string
    date: string
    time: string
    location: string
    address: string
    category: string
    city: string
    price: number | null
    image: string
    event_url: string
  }>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])

  const fetchInactiveEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: { city?: string; q?: string; page?: number; limit?: number } = { page: currentPage, limit: 20 }
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (selectedCity) params.city = selectedCity

      const result = await getInactiveEvents(params)
      setEvents(result.events || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch inactive events:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCity, currentPage])

  useEffect(() => {
    fetchInactiveEvents()
  }, [fetchInactiveEvents])

  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesData = await getCities()
        setCities(citiesData)
      } catch (err) {
        console.error('Error loading cities:', err)
      }
    }
    loadCities()
  }, [])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchInactiveEvents()
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event)
    setShowDeleteModal(true)
  }

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return

    setDeleteLoading(true)
    setError(null)

    // Optimistically remove the event from the UI
    const eventToRemove = eventToDelete
    setEvents(prev => prev.filter(e => e.id !== eventToRemove.id))

    // Adjust pagination if we removed the last item on the current page
    const remainingEvents = events.filter(e => e.id !== eventToRemove.id)
    if (remainingEvents.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }

    try {
      await deleteEvent(eventToRemove.id)
      setShowDeleteModal(false)
      setEventToDelete(null)
    } catch (err) {
      console.error('Failed to delete event:', err)
      // Restore the event if deletion failed
      setEvents(prev => [...prev, eventToRemove])
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar el evento')
      setShowDeleteModal(false)
      setEventToDelete(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEditEvent = (event: Event) => {
    // Open the event URL in a new tab
    if (event.event_url) {
      window.open(event.event_url, '_blank')
    }

    setEditingEventId(event.id)
    // Convert UTC timestamp to Colombia timezone
    const timestamp = event.utcTimestamp;
    const dateInColombia = new Date(timestamp);

    // Extract date in YYYY-MM-DD format for date input
    const dateStr = dateInColombia.toLocaleString('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Extract time in HH:MM format for time input
    const timeStr = dateInColombia.toLocaleString('en-GB', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Normalize string for comparison (remove accents and convert to lowercase)
    const normalizeString = (str: string) => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    }

    const categorySlug = CATEGORIES.find(c =>
      normalizeString(c.label) === normalizeString(event.category)
    )?.slug || ''

    setEditFormData({
      title: event.title,
      description: event.description,
      date: dateStr,
      time: timeStr,
      location: event.location,
      address: event.address,
      category: categorySlug,
      city: event.city,
      price: event.price,
      image: event.image || '',
      event_url: event.event_url || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setEditFormData({})
    setError(null)
  }

  const handleSaveAndApprove = async () => {
    if (!editingEventId || !editFormData.title || !editFormData.description || !editFormData.date || !editFormData.time || !editFormData.location || !editFormData.address || !editFormData.category || !editFormData.city) {
      setError('Todos los campos obligatorios deben estar completos')
      return
    }

    setEditLoading(true)
    setError(null)

    try {
      // Combine date and time into UTC timestamp
      const utcTimestamp = `${editFormData.date}T${editFormData.time}:00-05:00`

      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        date: editFormData.date,
        time: editFormData.time,
        location: editFormData.location,
        address: editFormData.address,
        category: editFormData.category,
        city: editFormData.city,
        price: editFormData.price,
        currency: 'COP' as const,
        image: editFormData.image || undefined,
        event_url: editFormData.event_url || undefined,
        tags: [],
        utcTimestamp,
        active: true // This will approve the event
      }

      const result = await updateEvent(editingEventId, updateData)

      if (result.success) {
        // Remove the event from inactive list since it's now approved
        setEvents(prev => prev.filter(e => e.id !== editingEventId))
        setEditingEventId(null)
        setEditFormData({})
      } else {
        setError(result.error || 'Error al guardar y aprobar el evento')
      }
    } catch (err) {
      console.error('Failed to save and approve event:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al guardar el evento')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Moderación de Eventos</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar eventos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-64"
        />
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Todas las Ciudades</option>
          <option value="bogota">Bogotá</option>
          <option value="medellin">Medellín</option>
          <option value="cali">Cali</option>
          <option value="barranquilla">Barranquilla</option>
          <option value="cartagena">Cartagena</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-600">Cargando eventos inactivos...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-600">No hay eventos inactivos para revisar</div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            editingEventId === event.id ? (
              <div key={event.id} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Editando Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input
                      type="text"
                      value={editFormData.title || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                    <select
                      value={editFormData.category || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    >
                      <option value="">Seleccionar categoría</option>
                      {CATEGORIES.filter(c => c.slug !== 'todos').map(cat => (
                        <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={editFormData.date || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                    <input
                      type="time"
                      value={editFormData.time || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación *</label>
                    <input
                      type="text"
                      value={editFormData.location || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                    <input
                      type="text"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                    <select
                      value={editFormData.city || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    >
                      <option value="">Seleccionar ciudad</option>
                      {cities.map(city => (
                        <option key={city.slug} value={city.slug}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                    <input
                      type="number"
                      value={editFormData.price || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Precio en COP"
                      min="0"
                      disabled={editLoading}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                    <textarea
                      rows={3}
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (URL)</label>
                    <input
                      type="url"
                      value={editFormData.image || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      disabled={editLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL del Evento</label>
                    <input
                      type="url"
                      value={editFormData.event_url || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, event_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://evento.com"
                      disabled={editLoading}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    disabled={editLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAndApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar y aprobar'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {event.image && (
                      <div className="flex-shrink-0">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>📅 {new Date(event.utcTimestamp).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}</span>
                        <span>📍 {event.city}</span>
                        <span>👤 {event.created_by || 'Sin organizador'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full w-fit">Revisión Pendiente</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {!loading && events.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded ${
                  page === currentPage
                    ? 'bg-blue-500 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && eventToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteEvent}
          isLoading={deleteLoading}
          title="Eliminar Evento"
          message={`¿Estás seguro de que quieres eliminar el evento "${eventToDelete.title}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmButtonStyle="danger"
        />
      )}
    </div>
  )
}

function AnalyticsTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Análisis e Informes</h2>
        <div className="flex space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg">
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Últimos 90 días</option>
            <option>Todo el tiempo</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Registros de Usuarios</h3>
          <div className="text-2xl font-bold text-blue-600 mb-1">+127</div>
          <div className="text-xs text-gray-500">+12% desde el mes pasado</div>
          <div className="mt-2 h-16 bg-blue-50 rounded flex items-end">
            <div className="bg-blue-500 h-8 w-2 rounded ml-1"></div>
            <div className="bg-blue-500 h-12 w-2 rounded ml-1"></div>
            <div className="bg-blue-500 h-6 w-2 rounded ml-1"></div>
            <div className="bg-blue-500 h-10 w-2 rounded ml-1"></div>
            <div className="bg-blue-500 h-14 w-2 rounded ml-1"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Creaciones de Eventos</h3>
          <div className="text-2xl font-bold text-green-600 mb-1">+89</div>
          <div className="text-xs text-gray-500">+8% desde el mes pasado</div>
          <div className="mt-2 h-16 bg-green-50 rounded flex items-end">
            <div className="bg-green-500 h-10 w-2 rounded ml-1"></div>
            <div className="bg-green-500 h-8 w-2 rounded ml-1"></div>
            <div className="bg-green-500 h-12 w-2 rounded ml-1"></div>
            <div className="bg-green-500 h-6 w-2 rounded ml-1"></div>
            <div className="bg-green-500 h-14 w-2 rounded ml-1"></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Tasa de Éxito de Minería</h3>
          <div className="text-2xl font-bold text-purple-600 mb-1">96.5%</div>
          <div className="text-xs text-gray-500">+2.1% desde el mes pasado</div>
          <div className="mt-2 h-16 bg-purple-50 rounded flex items-end">
            <div className="bg-purple-500 h-12 w-2 rounded ml-1"></div>
            <div className="bg-purple-500 h-14 w-2 rounded ml-1"></div>
            <div className="bg-purple-500 h-10 w-2 rounded ml-1"></div>
            <div className="bg-purple-500 h-13 w-2 rounded ml-1"></div>
            <div className="bg-purple-500 h-15 w-2 rounded ml-1"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Categorías Populares</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Música</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm text-gray-600">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tecnología</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
                <span className="text-sm text-gray-600">72%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Arte & Cultura</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '58%' }}></div>
                </div>
                <span className="text-sm text-gray-600">58%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Ciudades Principales</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Bogotá</span>
              <span className="text-sm font-medium">423 eventos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Medellín</span>
              <span className="text-sm font-medium">287 eventos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cali</span>
              <span className="text-sm font-medium">156 eventos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Barranquilla</span>
              <span className="text-sm font-medium">98 eventos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Configuración del Sistema</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Configuración de Plataforma</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Sitio
                </label>
                <input
                  type="text"
                  defaultValue="Qué hacer en..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad Predeterminada
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Bogotá</option>
                  <option>Medellín</option>
                  <option>Cali</option>
                  <option>Barranquilla</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eventos Por Página
                </label>
                <input
                  type="number"
                  defaultValue="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Guardar Cambios
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Configuración de Correo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host SMTP
                </label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo de Remitente
                </label>
                <input
                  type="email"
                  placeholder="noreply@quehaceren.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="email-notifications" className="mr-2" />
                <label htmlFor="email-notifications" className="text-sm text-gray-700">
                  Habilitar notificaciones de correo para admin
                </label>
              </div>
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Actualizar Configuración de Correo
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Gestión de Categorías</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Música</span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Tecnología</span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Arte & Cultura</span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              Agregar Nueva Categoría
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Mantenimiento del Sistema</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                Limpiar Caché
              </button>
              <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Reconstruir Índice de Búsqueda
              </button>
              <button className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                Ver Registros del Sistema
              </button>
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Respaldar Base de Datos
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Gestión de API</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Limitación de Tasa</span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Habilitado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Claves API</span>
                <span className="text-sm text-gray-600">3 activas</span>
              </div>
              <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                Gestionar Claves API
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}