'use client'

import { useState, useEffect } from 'react'
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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useSession()
  
  // Redirect function using Next.js best practices
  const handleSuccessfulAuth = () => {
    // 1. First priority: URL redirect parameter (from middleware)
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      router.push(redirectParam)
      return
    }
    
    // 2. Fallback: Use router history if available
    if (window.history.length > 1) {
      router.back()
      return
    }
    
    // 3. Final fallback: Landing page
    router.push('/')
  }
  
  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      handleSuccessfulAuth()
    }
  }, [isAuthenticated])

  async function onEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    const supabase = getSupabaseBrowserClient()
    
    if (isRegistering) {
      if (password !== confirmPassword) {
        setMessage('Las contraseñas no coinciden')
        setLoading(false)
        return
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:4000'}/auth/callback`
        }
      })
      
      if (error) {
        setMessage(translateSupabaseError(error))
      } else {
        setMessage('Cuenta creada exitosamente. Revisa tu correo para confirmar tu cuenta.')
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
    const redirectParam = searchParams.get('redirect')
    let nextUrl = '/'
    
    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      nextUrl = redirectParam
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:4000'}/auth/callback?next=${encodeURIComponent(nextUrl)}`
      }
    })
    
    if (error) setMessage(translateSupabaseError(error))
    setLoading(false)
  }


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
          <h1 className="text-xl font-semibold mb-4">
            {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
          </h1>
          
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isRegistering
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isRegistering
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Registrarse
            </button>
          </div>
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
          />
          <input 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
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


