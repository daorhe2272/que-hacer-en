import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, secret } = body

    // Validate required fields
    if (!path || !secret) {
      return NextResponse.json(
        { error: 'Missing required fields: path and secret' },
        { status: 400 }
      )
    }

    // Validate secret
    if (secret !== process.env.REVALIDATE_SECRET) {
      console.error('Revalidation failed: Invalid secret')
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Validate path format
    if (!path.startsWith('/eventos/')) {
      console.error('Revalidation failed: Invalid path format', { path })
      return NextResponse.json(
        { error: 'Invalid path format. Must start with /eventos/' },
        { status: 400 }
      )
    }

    // Revalidate the path
    revalidatePath(path)
    console.log('Successfully revalidated path:', path)

    return NextResponse.json(
      { success: true, message: `Revalidated ${path}` },
      { status: 200 }
    )
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}