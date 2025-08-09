'use client'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span className="font-medium">No pudimos cargar los eventos.</span>
      </div>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-sm text-red-700 hover:text-red-800 underline">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-14l-1-1"/></svg>
          Reintentar
        </button>
      )}
    </div>
  )
}


