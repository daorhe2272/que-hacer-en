"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type UserProfile = {
  id: string
  email: string | null
  role: 'attendee' | 'organizer' | 'admin'
}

type SessionContextValue = {
  isAuthenticated: boolean
  user: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshProfile() {
    try {
      const { getUserProfile } = await import('./api')
      const profile = await getUserProfile()
      if (profile) setUser(profile)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const { getSupabaseBrowserClient } = await import('./supabase/client')
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase.auth.getSession()
        const hasSession = !!data.session
        if (!mounted) return
        setIsAuthenticated(hasSession)
        if (hasSession) await refreshProfile()
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    async function subscribe() {
      const { getSupabaseBrowserClient } = await import('./supabase/client')
      const supabase = getSupabaseBrowserClient()
      const { data } = supabase.auth.onAuthStateChange((_event: unknown, session: unknown) => {
        const authed = !!session
        setIsAuthenticated(authed)
        if (authed) refreshProfile()
        else setUser(null)
      })
      return () => data.subscription.unsubscribe()
    }
    let cleanup: (() => void) | undefined
    subscribe().then(fn => cleanup = fn).catch(() => {})
    return () => { mounted = false; if (cleanup) cleanup() }
  }, [])

  async function signOut() {
    const { getSupabaseBrowserClient } = await import('./supabase/client')
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
  }

  const value = useMemo<SessionContextValue>(() => ({ isAuthenticated, user, loading, refreshProfile, signOut }), [isAuthenticated, user, loading])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}


