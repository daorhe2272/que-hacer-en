import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next')

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If we have a specific redirect destination, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Otherwise, redirect to a page that can handle back navigation
      // Check if there's a redirect parameter in the original request
      const redirectParam = searchParams.get('redirect')
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || origin

      if (redirectParam) {
        return NextResponse.redirect(`${webUrl}/auth/success?redirect=${encodeURIComponent(redirectParam)}`)
      } else {
        return NextResponse.redirect(`${webUrl}/auth/success`)
      }
    }
  }

  // return the user to an error page with instructions
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || origin
  return NextResponse.redirect(`${webUrl}/auth/auth-code-error`)
}