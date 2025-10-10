"use client"

import { getAdminStats, getDataSources, createDataSource, deleteDataSource, triggerDataSourceMining, getCities, type DataSource, type City } from '@/lib/api'
import ConfirmationModal from '@/components/ConfirmationModal'
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
  const [stats, setStats] = useState({ totalUsers: 0, activeEvents: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats()
        setStats(data)
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
          <div className="text-2xl font-bold text-yellow-600">23</div>
          <div className="text-sm text-yellow-600">Revisiones Pendientes</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">hace 2h</div>
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
              <div className="text-xs opacity-90">23 pendientes</div>
            </button>
            <button className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <div className="text-sm font-medium">Gestionar Usuarios</div>
              <div className="text-xs opacity-90">
                {loading ? '...' : `${stats.totalUsers.toLocaleString()} total`}
              </div>
            </button>
            <button className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <div className="text-sm font-medium">Ejecutar Minería</div>
              <div className="text-xs opacity-90">Último: hace 2h</div>
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
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Moderación de Eventos</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Aprobar Todos
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            Rechazar Todos
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar eventos..."
          className="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-64"
        />
        <select className="px-3 py-2 border border-gray-300 rounded-lg">
          <option>Todos los Estados</option>
          <option>Pendiente</option>
          <option>Aprobado</option>
          <option>Rechazado</option>
          <option>Publicado</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg">
          <option>Todas las Ciudades</option>
          <option>Bogotá</option>
          <option>Medellín</option>
          <option>Cali</option>
        </select>
        <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
          Filtrar
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">Festival de Música de Verano</h3>
              <p className="text-sm text-gray-600 mt-1">Un evento de música al aire libre fantástico con artistas locales e internacionales.</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>📅 15 Dic 2024</span>
                <span>📍 Bogotá</span>
                <span>👤 john@example.com</span>
              </div>
            </div>
            <div className="flex flex-col space-y-2 ml-4">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full w-fit">Revisión Pendiente</span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                  Aprobar
                </button>
                <button className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                  Rechazar
                </button>
                <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">Conferencia de Tecnología 2024</h3>
              <p className="text-sm text-gray-600 mt-1">Conferencia anual de tecnología con talleres y networking.</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>📅 20 Nov 2024</span>
                <span>📍 Medellín</span>
                <span>👤 organizer@example.com</span>
              </div>
            </div>
            <div className="flex flex-col space-y-2 ml-4">
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full w-fit">Aprobado</span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600">
                  Ver
                </button>
                <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                  Editar
                </button>
                <button className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Anterior</button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Siguiente</button>
        </div>
      </div>
    </div>
  )
}

function DataSourcesTab() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [showDialog, setShowDialog] = useState(false)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<DataSource | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceType, setNewSourceType] = useState<'regular' | 'occasional'>('regular')
  const [newSourceCity, setNewSourceCity] = useState('')
  const [filterSourceType, setFilterSourceType] = useState<'regular' | 'occasional'>('regular')
  const [filterCity, setFilterCity] = useState('bogota')
  const [filterActive, setFilterActive] = useState<boolean | ''>(true)

  const loadDataSources = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getDataSources({})
      setDataSources(result.data_sources)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar fuentes de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDataSources()
  }, [loadDataSources])

  const toggleSelection = (id: string) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const filteredSources = dataSources.filter(source => {
      if (filterSourceType && source.source_type !== filterSourceType) return false
      if (filterCity && source.city_slug !== filterCity) return false
      if (filterActive !== '' && source.active !== filterActive) return false
      return true
    })

    if (selectedSources.size === filteredSources.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(filteredSources.map(s => s.id)))
    }
  }

  const handleCreateSource = async () => {
    if (!newSourceUrl.trim()) return

    try {
      const data: Parameters<typeof createDataSource>[0] = {
        url: newSourceUrl.trim(),
        source_type: newSourceType
      }
      if (newSourceType === 'regular' && newSourceCity) {
        data.city_slug = newSourceCity
      }

      await createDataSource(data)
      setShowAddSourceDialog(false)
      setNewSourceUrl('')
      setNewSourceCity('')
      loadDataSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear fuente de datos')
    }
  }

  const handleDeleteSource = (source: DataSource) => {
    setSourceToDelete(source)
    setShowDeleteDialog(true)
    setError(null)
  }

  const confirmDeleteSource = async () => {
    if (!sourceToDelete) return

    setDeleteLoading(true)
    setError(null)
    try {
      await deleteDataSource(sourceToDelete.id)
      setShowDeleteDialog(false)
      setSourceToDelete(null)
      loadDataSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar fuente de datos')
      setShowDeleteDialog(false)
      setSourceToDelete(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleTriggerMining = async () => {
    if (selectedSources.size === 0) {
      setShowWarningDialog(true)
      return
    }

    try {
      // Trigger mining for all selected sources
      const promises = Array.from(selectedSources).map(id => triggerDataSourceMining(id))
      await Promise.all(promises)
      setShowDialog(false)
      setSelectedSources(new Set())
      loadDataSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar minería')
    }
  }

  const filteredSources = dataSources.filter(source => {
    if (filterSourceType && source.source_type !== filterSourceType) return false
    if (filterCity && source.city_slug !== filterCity) return false
    if (filterActive !== '' && source.active !== filterActive) return false
    return true
  })

  const [cities, setCities] = useState<City[]>([])

  const loadCities = useCallback(async () => {
    try {
      const citiesData = await getCities()
      setCities(citiesData)
    } catch (err) {
      console.error('Error loading cities:', err)
      // Fallback to static list if API fails
      setCities([
        { id: 1, slug: 'bogota', name: 'Bogotá' },
        { id: 2, slug: 'medellin', name: 'Medellín' },
        { id: 3, slug: 'cali', name: 'Cali' },
        { id: 4, slug: 'barranquilla', name: 'Barranquilla' },
        { id: 5, slug: 'cartagena', name: 'Cartagena' }
      ])
    }
  }, [])

  useEffect(() => {
    loadDataSources()
    loadCities()
  }, [loadDataSources, loadCities])

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fuentes de Datos y Minería</h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona las fuentes de datos y ejecuta trabajos de minería</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
            onClick={() => setShowAddSourceDialog(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Agregar Fuente
          </button>
          <button
            className="px-6 py-3 bg-accent-400 text-white rounded-lg hover:bg-accent-500 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
            onClick={() => {
              if (selectedSources.size === 0) {
                setShowWarningDialog(true)
                return
              }
              setShowDialog(true)
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Ejecutar Minería
          </button>
        </div>
      </div>


      {/* Enhanced Mining Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Mining Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Estado de Minería</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full animate-pulse">
                Ejecutándose
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progreso Actual</span>
                <span className="text-sm font-bold text-primary-600">65%</span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: '65%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">Procesando eventos... 65% completado</p>
            </div>
            
            <div className="flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all duration-200 hover:scale-105 flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Detener
              </button>
              <button className="flex-1 px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-all duration-200 hover:scale-105 flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Registros
              </button>
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trabajos Recientes</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Trabajo #1234</div>
                    <div className="text-xs text-gray-500">Completado • hace 2 horas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">156 eventos</div>
                  <div className="text-xs text-gray-500">Éxito: 98%</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Trabajo #1233</div>
                    <div className="text-xs text-gray-500">Completado • hace 1 día</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">203 eventos</div>
                  <div className="text-xs text-gray-500">Éxito: 95%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-600">Cargando fuentes de datos...</div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div>
          {/* Minimalist Dropdown Filter Row */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                {/* Source Type Dropdown */}
                <select
                  value={filterSourceType}
                  onChange={(e) => setFilterSourceType(e.target.value as 'regular' | 'occasional')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
                >
                  <option value="regular">Regulares</option>
                  <option value="occasional">Ocasionales</option>
                </select>

                {/* City Dropdown */}
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
                >
                  <option value="">Todas</option>
                  {cities.map(city => (
                    <option key={city.slug} value={city.slug}>{city.name}</option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={filterActive === '' ? '' : String(filterActive)}
                  onChange={(e) => setFilterActive(e.target.value === '' ? '' : e.target.value === 'true')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  setFilterSourceType('regular')
                  setFilterCity('')
                  setFilterActive('')
                }}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 hover:scale-105 font-medium"
              >
                <span className="mr-2">🧹</span>
                <span className="text-sm">Limpiar</span>
              </button>
            </div>
          </div>

          {/* Enhanced Data Sources Header */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Fuentes de Datos
              <span className="ml-2 px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full">
                {filteredSources.length} de {dataSources.length}
              </span>
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {filterCity && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  🏙 {cities.find(c => c.slug === filterCity)?.name || filterCity}
                </span>
              )}
              {filterSourceType && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  {filterSourceType === 'regular' ? '📍 Regulares' : '🎯 Ocasionales'}
                </span>
              )}
              {filterActive !== '' && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  {filterActive ? '✅ Activos' : '❌ Inactivos'}
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Data Sources Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      checked={selectedSources.size === filteredSources.length && filteredSources.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">URL</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Última Minería</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSources.has(source.id)}
                      onChange={() => toggleSelection(source.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-gray-700 break-all hover:text-primary-600 hover:underline transition-colors duration-200"
                    >
                      {source.url}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                      source.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {source.active ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {source.last_mined
                      ? new Date(source.last_mined).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDeleteSource(source)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </td>
                </tr>
                ))}
                {filteredSources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fuentes de datos</h3>
                      <p className="text-gray-600 mb-4">No se encontraron fuentes que coincidan con los filtros seleccionados</p>

                      {filterCity || filterSourceType || filterActive !== '' ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-500">
                            <p>Filtros activos:</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                              {filterCity && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  🏙 {cities.find(c => c.slug === filterCity)?.name || filterCity}
                                </span>
                              )}
                              {filterSourceType && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  {filterSourceType === 'regular' ? '📍 Regulares' : '🎯 Ocasionales'}
                                </span>
                              )}
                              {filterActive !== '' && (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  {filterActive ? '✅ Activos' : '❌ Inactivos'}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setFilterSourceType('regular')
                              setFilterCity('')
                              setFilterActive('')
                            }}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                          >
                            Limpiar todos los filtros
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddSourceDialog(true)}
                          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                        >
                          Agregar primera fuente
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredSources.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fuentes de datos</h3>
              <p className="text-gray-600 mb-4">No se encontraron fuentes que coincidan con los filtros seleccionados</p>
              
              {filterCity || filterSourceType || filterActive !== '' ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-500">
                    <p>Filtros activos:</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {filterCity && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          🏙 {cities.find(c => c.slug === filterCity)?.name || filterCity}
                        </span>
                      )}
                      {filterSourceType && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {filterSourceType === 'regular' ? '📍 Regulares' : '🎯 Ocasionales'}
                        </span>
                      )}
                      {filterActive !== '' && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {filterActive ? '✅ Activos' : '❌ Inactivos'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFilterSourceType('regular')
                      setFilterCity('')
                      setFilterActive('')
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSourceDialog(true)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                >
                  Agregar primera fuente
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-100 transform transition-all duration-300 ease-out scale-100 animate-fadeIn">
            {/* Header Section with Icon */}
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mr-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Confirmar Trabajo de Minería</h3>
                <p className="text-sm text-gray-600 mt-1">Procesamiento de fuentes de datos</p>
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-primary-800">
                    {selectedSources.size} fuente{selectedSources.size !== 1 ? 's' : ''} seleccionada{selectedSources.size !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3 font-medium">Se ejecutará el trabajo de minería para las siguientes URLs:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {Array.from(selectedSources).map((id) => {
                    const source = dataSources.find(s => s.id === id)
                    return source ? (
                      <li key={id} className="flex items-start">
                        <svg className="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700 break-all font-mono bg-white px-2 py-1 rounded border border-gray-200">{source.url}</span>
                      </li>
                    ) : null
                  })}
                </ul>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Tiempo estimado: 2-5 minutos</p>
                <p className="text-xs mt-1">El proceso se ejecutará en segundo plano</p>
              </div>
            </div>

            {/* Button Section */}
            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center"
                onClick={() => setShowDialog(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center"
                onClick={handleTriggerMining}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-100 transform transition-all duration-300 ease-out scale-100 animate-fadeIn">
            {/* Header Section with Warning Icon */}
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Advertencia</h3>
                <p className="text-sm text-gray-600 mt-1">No hay fuentes seleccionadas</p>
              </div>
            </div>

            {/* Warning Message Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Por favor, selecciona al menos una fuente de datos antes de ejecutar el trabajo de minería.</p>
                </div>
              </div>
            </div>

            {/* Guidance Section */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3 font-medium">Para seleccionar fuentes:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Marca las casillas en la tabla de fuentes</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Usa &quot;Seleccionar todo&quot; para elegir todas las fuentes</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Cambia entre &quot;Fuentes Regulares&quot; y &quot;Fuentes Ocasionales&quot; según necesites</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Button Section */}
            <div className="flex justify-end">
              <button
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center"
                onClick={() => setShowWarningDialog(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSourceDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-100 transform transition-all duration-300 ease-out scale-100 animate-slideIn">
            {/* Header Section with Icon */}
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mr-4 shadow-sm">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Agregar Nueva Fuente</h3>
                <p className="text-sm text-gray-600 mt-1">Ingresa la URL de la fuente de datos</p>
              </div>
            </div>

            {/* Input Section */}
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor="source-url" className="block text-sm font-semibold text-gray-700 mb-2">
                  URL de la Fuente
                </label>
                <input
                  id="source-url"
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://ejemplo.com/eventos"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors shadow-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Ingresa una URL válida que contenga información de eventos
                </p>
              </div>

              <div>
                <label htmlFor="source-type" className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Fuente
                </label>
                <select
                  id="source-type"
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value as 'regular' | 'occasional')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors shadow-sm"
                >
                  <option value="regular">Regular - Fuentes específicas de ciudad</option>
                  <option value="occasional">Ocasional - Fuentes temporales o generales</option>
                </select>
              </div>

              {newSourceType === 'regular' && (
                <div>
                  <label htmlFor="source-city" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <select
                    id="source-city"
                    value={newSourceCity}
                    onChange={(e) => setNewSourceCity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors shadow-sm"
                  >
                    <option value="">Seleccionar ciudad...</option>
                    {cities.map(city => (
                      <option key={city.slug} value={city.slug}>{city.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Button Section */}
            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center"
                onClick={() => {
                  setShowAddSourceDialog(false)
                  setNewSourceUrl('')
                  setNewSourceCity('')
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newSourceUrl.trim() || !isValidUrl(newSourceUrl) || (newSourceType === 'regular' && !newSourceCity)}
                onClick={handleCreateSource}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && sourceToDelete && (
        <ConfirmationModal
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDeleteSource}
          isLoading={deleteLoading}
          title="Eliminar Fuente de Datos"
          message={`¿Estás seguro de que quieres eliminar la fuente "${sourceToDelete.url}"? Esta acción no se puede deshacer.`}
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