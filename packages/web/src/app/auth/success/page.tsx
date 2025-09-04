'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Small delay to ensure the session is properly set
    const timer = setTimeout(() => {
      // Go back to the previous page, just like the email/password login
      router.back()
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}