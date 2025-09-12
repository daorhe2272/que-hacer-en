import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  console.log('AUTH CALLBACK DEBUG:', {
    requestUrl: request.url,
    origin: origin,
    headers: Object.fromEntries(request.headers.entries())
  })
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
      // Using a special callback page that can run client-side router.back()
      return NextResponse.redirect(`${origin}/auth/success`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}