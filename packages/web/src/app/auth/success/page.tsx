'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Helper function to validate redirect URLs for security
function isValidRedirectUrl(url: string): boolean {
  try {
    // Only allow relative URLs that start with /
    if (!url.startsWith('/')) return false

    // Prevent protocol-relative URLs (//example.com)
    if (url.startsWith('//')) return false

    // Don't allow javascript: or other dangerous protocols
    if (url.includes(':')) return false

    return true
  } catch {
    return false
  }
}

function AuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Small delay to ensure the session is properly set
    const timer = setTimeout(() => {
      // 1. First priority: URL redirect parameter (from middleware)
      const redirectParam = searchParams.get('redirect')
      if (redirectParam && isValidRedirectUrl(redirectParam)) {
        // Use window.location.href to avoid TypeScript route typing issues
        window.location.href = redirectParam
        return
      }

      // 2. Fallback: redirect to home page (since router.back() would go to Google)
      router.replace('/')
    }, 100)

    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  )
}