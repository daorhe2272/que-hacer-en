'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient, translateSupabaseError } from '@/lib/supabase/client'
import { useSession } from '@/lib/session'

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

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [authMode, setAuthMode] = useState<'choice' | 'login' | 'register'>('choice')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useSession()

  // Password validation function
  const validatePassword = (password: string): string | null => {
    if (password.length === 0) return null // Don't show error for empty field initially

    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres'
    }

    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasLetter) {
      return 'La contraseña debe contener al menos una letra'
    }

    if (!hasNumber) {
      return 'La contraseña debe contener al menos un número'
    }

    return null
  }

  // Handle password input changes with validation
  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (isRegistering) {
      setPasswordError(validatePassword(value))
    }
  }
  
  // Redirect function using Next.js best practices
  const handleSuccessfulAuth = useCallback(() => {
    // 1. First priority: URL redirect parameter (from middleware)
    let redirectParam = searchParams.get('redirect')

    // 2. If no redirect param, try to get referrer from document.referrer
    if (!redirectParam && typeof window !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer)
        // Only use referrer if it's from the same origin and not the login page
        if (referrerUrl.origin === window.location.origin &&
            referrerUrl.pathname !== '/login' &&
            isValidRedirectUrl(referrerUrl.pathname)) {
          redirectParam = referrerUrl.pathname
        }
      } catch {
        // Invalid referrer URL, ignore
      }
    }

    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      // Use window.location.href for validated redirect URLs to avoid typed route conflicts
      window.location.href = redirectParam
      return
    }

    // 3. Fallback: Go back to previous page if available
    router.back()
  }, [router, searchParams])
  
  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      handleSuccessfulAuth()
    }
  }, [isAuthenticated, handleSuccessfulAuth])

  async function onEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    const supabase = getSupabaseBrowserClient()
    
    if (isRegistering) {
      // Validate password requirements
      const passwordValidationError = validatePassword(password)
      if (passwordValidationError) {
        setMessage(passwordValidationError)
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setMessage('Las contraseñas no coinciden')
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setMessage(translateSupabaseError(error))
      } else if (data.user) {
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (signInError) {
            setMessage('Cuenta creada pero hubo un problema al iniciar sesión. Intenta iniciar sesión manualmente.')
          }
          // If successful, useEffect will handle the redirect when isAuthenticated becomes true
        }
        // If data.session exists, user is already authenticated and useEffect will handle redirect
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(translateSupabaseError(error))
      }
      // No success message needed - redirect will happen automatically via useEffect
    }
    
    setLoading(false)
  }

  async function onGoogleAuth() {
    setLoading(true)
    setMessage(null)

    const supabase = getSupabaseBrowserClient()

    // Get the redirect destination (same logic as handleSuccessfulAuth)
    let redirectParam = searchParams.get('redirect')

    // If no redirect param, try to get referrer from document.referrer
    if (!redirectParam && typeof window !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer)
        // Only use referrer if it's from the same origin and not the login page
        if (referrerUrl.origin === window.location.origin &&
            referrerUrl.pathname !== '/login' &&
            isValidRedirectUrl(referrerUrl.pathname)) {
          redirectParam = referrerUrl.pathname
        }
      } catch {
        // Invalid referrer URL, ignore
      }
    }

    let redirectUrl = `${window.location.origin}/auth/callback`

    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      // If we have a redirect destination, pass it to callback
      redirectUrl += `?next=${encodeURIComponent(redirectParam)}`
    }
    // If no redirect param, let the callback handle the fallback navigation

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })

    if (error) setMessage(translateSupabaseError(error))
    setLoading(false)
  }


  // Choice step - first decide login or register
  if (authMode === 'choice') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/hero-background.jpeg')"
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
        <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-2 text-gray-900">
              Bienvenido
            </h1>
            <p className="text-gray-600 mb-6">
              ¿Qué te gustaría hacer?
            </p>

            {/* Choice buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setAuthMode('login')
                  setIsRegistering(false)
                }}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => {
                  setAuthMode('register')
                  setIsRegistering(true)
                }}
                className="w-full border-2 border-primary-600 text-primary-600 hover:bg-primary-50 py-3 rounded-lg font-medium transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Crear cuenta nueva
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o continúa con</span>
            </div>
          </div>

          {/* Google Button */}
          <button
            onClick={onGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('exitosamente')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Form step - show email/password forms after choice
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 relative z-10">
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setAuthMode('choice')
              setMessage(null)
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              setPasswordError(null)
            }}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          <h1 className="text-xl font-semibold mb-4">
            {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
          </h1>
        </div>

        {/* Email/Password Form */}
        <form className="space-y-3 mb-4" onSubmit={onEmailPassword}>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="space-y-2">
            <input
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                passwordError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              required
            />
            {passwordError && (
              <p className="text-sm text-red-600 flex items-start">
                <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {passwordError}
              </p>
            )}
          </div>
          {isRegistering && (
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          )}
          <button
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Procesando...' : (isRegistering ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>
        </form>

        {/* Alternative option */}
        <div className="text-center">
          <button
            onClick={() => {
              if (isRegistering) {
                setAuthMode('login')
                setIsRegistering(false)
              } else {
                setAuthMode('register')
                setIsRegistering(true)
              }
              setMessage(null)
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              setPasswordError(null)
            }}
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            {isRegistering ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear cuenta'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('exitosamente')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
