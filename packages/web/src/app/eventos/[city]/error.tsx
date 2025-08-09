'use client'

export default function Error({ reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Ocurrió un problema</h2>
        <p className="text-gray-600 mb-6">No pudimos cargar esta página. Intenta recargar.</p>
        <button
          onClick={() => reset()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
