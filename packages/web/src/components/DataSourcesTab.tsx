"use client"

import { useState, useEffect, useCallback } from 'react'
import { getDataSources, createDataSource, deleteDataSource, triggerDataSourceMining, getCities, mineUrlStreaming, type DataSource, type City } from '@/lib/api'

export default function DataSourcesTab() {
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

  // One-time URL mining state
  const [oneTimeUrl, setOneTimeUrl] = useState('')
  const [oneTimeMining, setOneTimeMining] = useState(false)
  const [oneTimeResult, setOneTimeResult] = useState<{ success: boolean; message?: string; eventsStored?: number; error?: string } | null>(null)

  // Mining status state
  const [miningStatus, setMiningStatus] = useState<{
    isActive: boolean
    status: 'idle' | 'running' | 'completed' | 'failed'
    message: string
    startTime?: Date
  }>({
    isActive: false,
    status: 'idle',
    message: 'Sin actividad de minería'
  })

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

    // Close modal immediately
    setShowDialog(false)

    // Update mining status at the start
    setMiningStatus({
      isActive: true,
      status: 'running',
      message: 'Iniciando minería de datos...',
      startTime: new Date()
    })

    try {
      // Trigger mining for all selected sources
      const promises = Array.from(selectedSources).map(id => triggerDataSourceMining(id))
      await Promise.all(promises)

      // Update mining status on successful completion
      setMiningStatus({
        isActive: false,
        status: 'completed',
        message: 'Minería completada exitosamente',
        startTime: new Date()
      })

      setSelectedSources(new Set())
      loadDataSources()
    } catch (err) {
      // Update mining status on failure
      setMiningStatus({
        isActive: false,
        status: 'failed',
        message: 'Error durante la minería',
        startTime: new Date()
      })

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

  const handleOneTimeMining = async () => {
    if (!oneTimeUrl.trim() || !isValidUrl(oneTimeUrl)) {
      setOneTimeResult({
        success: false,
        error: 'Por favor ingresa una URL válida'
      })
      return
    }

    setOneTimeMining(true)
    setOneTimeResult(null)
    setError(null)

    // Start mining status
    setMiningStatus({
      isActive: true,
      status: 'running',
      message: 'Iniciando proceso de minería...',
      startTime: new Date()
    })

    try {
      const result = await mineUrlStreaming(oneTimeUrl.trim(), (progress: { status: string; message?: string; eventsExtracted?: number; eventsStored?: number; eventsFailed?: number }) => {
        // Only update for completion/failure messages
        if (progress.status === 'completed' || progress.status === 'failed') {
          setMiningStatus(prev => ({
            ...prev,
            status: progress.status === 'completed' ? 'completed' : 'failed',
            message: progress.message || (progress.status === 'completed' ? 'Completado' : 'Error'),
            isActive: false
          }))
        }
      })

      if (result.success) {
        setOneTimeResult({
          success: true,
          message: result.details || `Minería completada exitosamente`,
          eventsStored: result.eventsStored
        })

        // Refresh data sources to show any new sources that might have been created
        loadDataSources()
      } else {
        setOneTimeResult({
          success: false,
          error: result.error || 'Error durante la minería'
        })
      }
    } catch (err) {
      setOneTimeResult({
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido'
      })
      setMiningStatus(prev => ({
        ...prev,
        status: 'failed',
        message: 'Error durante el proceso de minería',
        isActive: false
      }))
    } finally {
      setOneTimeMining(false)
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
              <div className={`w-2 h-2 rounded-full ${
                miningStatus.status === 'running' ? 'bg-green-500 animate-pulse' :
                miningStatus.status === 'completed' ? 'bg-blue-500' :
                miningStatus.status === 'failed' ? 'bg-red-500' :
                'bg-gray-400'
              }`}></div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                miningStatus.status === 'running' ? 'bg-green-100 text-green-800 animate-pulse' :
                miningStatus.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                miningStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {miningStatus.status === 'running' ? 'Ejecutándose' :
                 miningStatus.status === 'completed' ? 'Completado' :
                 miningStatus.status === 'failed' ? 'Fallido' :
                 'Inactivo'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Estado Actual</span>
                <span className="text-sm font-bold text-primary-600">
                  {miningStatus.startTime ? new Date(miningStatus.startTime).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : '--:--:--'}
                </span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                {miningStatus.isActive ? (
                  <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                ) : (
                  <div className="h-full bg-gray-300 rounded-full"></div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">{miningStatus.message}</p>
            </div>

            <div className="flex space-x-3">
              <button
                className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all duration-200 hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!miningStatus.isActive}
              >
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

      {/* One-Time URL Mining Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-accent-100 rounded-full mr-3">
            <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Minería URL Única</h3>
            <p className="text-sm text-gray-600">Mina eventos de cualquier URL sin crear una fuente permanente</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              type="url"
              value={oneTimeUrl}
              onChange={(e) => setOneTimeUrl(e.target.value)}
              placeholder="https://ejemplo.com/eventos"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
              disabled={oneTimeMining}
            />
          </div>
          <button
            onClick={handleOneTimeMining}
            disabled={oneTimeMining || !oneTimeUrl.trim()}
            className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center justify-center min-w-32"
          >
            {oneTimeMining ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Minando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Minar URL
              </>
            )}
          </button>
        </div>

        {oneTimeResult && (
          <div className={`p-4 rounded-lg border ${oneTimeResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-start">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 flex-shrink-0 ${oneTimeResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                {oneTimeResult.success ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {oneTimeResult.success ? '¡Minería completada!' : 'Error en la minería'}
                </div>
                <div className="text-sm mt-1">
                  {oneTimeResult.success ? (
                    <>
                      {oneTimeResult.message}
                      {oneTimeResult.eventsStored !== undefined && (
                        <span className="block font-semibold mt-1">
                          Eventos almacenados: {oneTimeResult.eventsStored}
                        </span>
                      )}
                    </>
                  ) : (
                    oneTimeResult.error
                  )}
                </div>
              </div>
              {oneTimeResult.success && (
                <button
                  onClick={() => setOneTimeResult(null)}
                  className="ml-3 text-green-600 hover:text-green-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
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

      {/* Confirmation Dialog for Mining */}
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

      {/* Warning Dialog for No Sources Selected */}
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
                    <span className="text-sm text-gray-700">Usa "Seleccionar todo" para elegir todas las fuentes</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Cambia entre "Fuentes Regulares" y "Fuentes Ocasionales" según necesites</span>
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

      {/* Add Source Dialog */}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && sourceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-100 transform transition-all duration-300 ease-out scale-100 animate-fadeIn">
            {/* Header Section with Delete Icon */}
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Eliminar Fuente de Datos</h3>
                <p className="text-sm text-gray-600 mt-1">Confirmar eliminación permanente</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-medium">¿Estás seguro de que quieres eliminar la fuente?</p>
                  <p className="text-xs mt-1 font-mono bg-white p-2 rounded border mt-2 break-all">{sourceToDelete.url}</p>
                  <p className="text-xs mt-2">Esta acción no se puede deshacer.</p>
                </div>
              </div>
            </div>

            {/* Button Section */}
            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteLoading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={confirmDeleteSource}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}