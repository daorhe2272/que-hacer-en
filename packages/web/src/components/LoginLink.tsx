'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ReactNode } from 'react'

interface LoginLinkProps {
  children: ReactNode
  className?: string
  variant?: 'link' | 'button'
}

/**
 * Universal LoginLink component that automatically captures the current page
 * and adds it as a redirect parameter, ensuring users return to where they were
 * after authentication (email, Google OAuth, or registration).
 */
export function LoginLink({ children, className = '', variant = 'link' }: LoginLinkProps) {
  const pathname = usePathname()

  // Don't redirect if already on login page or auth pages
  const shouldRedirect = pathname !== '/login' && !pathname.startsWith('/auth/')

  const loginUrl = shouldRedirect
    ? `/login?redirect=${encodeURIComponent(pathname)}`
    : '/login'

  if (variant === 'button') {
    return (
      <Link href={loginUrl as '/login'} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <Link href={loginUrl as '/login'} className={className}>
      {children}
    </Link>
  )
}