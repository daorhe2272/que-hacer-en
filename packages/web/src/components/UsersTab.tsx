"use client"

import { useState, useEffect, useCallback } from 'react'
import { getAdminUsers, type AdminUser } from '@/lib/api'

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  attendee: 'Asistente',
  organizer: 'Organizador',
  admin: 'Admin'
}

const ROLE_BADGE_CLASSES: Record<AdminUser['role'], string> = {
  attendee: 'bg-gray-100 text-gray-800',
  organizer: 'bg-green-100 text-green-800',
  admin: 'bg-red-100 text-red-800'
}

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getAdminUsers({ page: currentPage, limit: 20 })
      setUsers(result.users || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalUsers(result.pagination?.total || 0)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-600">Cargando usuarios...</div>
        </div>
      ) : (
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                        {(user.email || user.displayName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.email || 'Sin correo'}</div>
                        {user.displayName && (
                          <div className="text-xs text-gray-500">{user.displayName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${ROLE_BADGE_CLASSES[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                      <button className="text-red-600 hover:text-red-800 text-sm">Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-600">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, totalUsers)} de {totalUsers.toLocaleString()} usuarios
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
