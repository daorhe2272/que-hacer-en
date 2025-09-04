import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/crear-evento',
  '/eventos/crear',
  '/admin',
  '/organizer',
  '/mi-perfil',
  '/mis-eventos',
  '/favoritos'
]

// Routes that require specific roles
const roleProtectedRoutes = {
  organizer: [
    '/mis-eventos'
  ],
  admin: [
    '/admin'
  ]
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Check if route requires protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  )
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  try {
    // Create Supabase client for middleware
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...options })
            })
          }
        }
      }
    )

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()

    // If no session, redirect to login
    if (!session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Check if this route requires specific role authorization
    let requiresRoleCheck = false
    for (const routes of Object.values(roleProtectedRoutes)) {
      if (routes.some(route => pathname.startsWith(route) || pathname === route)) {
        requiresRoleCheck = true
        break
      }
    }

    // If route doesn't require role check, just allow authenticated access
    if (!requiresRoleCheck) {
      return response
    }

    // Get user profile to check role for role-protected routes only
    const token = session.access_token
    const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-correlation-id': crypto.randomUUID()
      }
    })

    if (!profileResponse.ok) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const profile = await profileResponse.json()
    const userRole = profile.role as 'attendee' | 'organizer' | 'admin'

    // Check role-based access
    for (const [requiredRole, routes] of Object.entries(roleProtectedRoutes)) {
      const routeRequiresRole = routes.some(route => 
        pathname.startsWith(route) || pathname === route
      )
      
      if (routeRequiresRole) {
        // Admin can access everything
        if (userRole === 'admin') {
          break
        }
        
        // Check if user has required role
        if (userRole !== requiredRole) {
          const redirectUrl = new URL('/eventos/bogota', request.url)
          redirectUrl.searchParams.set('error', 'unauthorized')
          return NextResponse.redirect(redirectUrl)
        }
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}