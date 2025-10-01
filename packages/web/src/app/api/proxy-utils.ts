import { NextRequest, NextResponse } from 'next/server'

// Internal API URL for server-to-server communication within container
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001'

export interface ProxyConfig {
  method: string
  path: string
  request: NextRequest
}

/**
 * Forward a request to the internal Express API
 */
export async function forwardToInternalAPI({ method, path, request }: ProxyConfig): Promise<NextResponse> {
  try {
    const url = `${INTERNAL_API_URL}${path}`
    
    // Extract headers from the incoming request
    const headers: Record<string, string> = {}
    
    // Forward important headers
    const headersToForward = [
      'authorization',
      'content-type',
      'accept',
      'user-agent',
      'x-correlation-id'
    ]
    
    headersToForward.forEach(headerName => {
      const value = request.headers.get(headerName)
      if (value) {
        headers[headerName] = value
      }
    })

    // Get request body for POST/PUT requests
    let body: string | undefined
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      try {
        body = await request.text()
      } catch (error) {
        console.error('Error reading request body:', error)
      }
    }

    // Forward the request to internal API
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body,
    })

    // Get response data
    const responseData = await response.text()
    
    // Create response with same status and headers
    const nextResponse = new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
    })

    // Forward response headers
    response.headers.forEach((value, key) => {
      // Skip headers that NextResponse manages automatically
      if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        nextResponse.headers.set(key, value)
      }
    })

    return nextResponse

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Create a proxy handler for an API route
 */
export function createProxyHandler(apiPath: string) {
  return {
    async GET(request: NextRequest) {
      const url = new URL(request.url)
      const fullPath = apiPath + url.search
      return forwardToInternalAPI({
        method: 'GET',
        path: fullPath,
        request
      })
    },

    async POST(request: NextRequest) {
      const url = new URL(request.url)
      const fullPath = apiPath + url.search
      return forwardToInternalAPI({
        method: 'POST',
        path: fullPath,
        request
      })
    },

    async PUT(request: NextRequest) {
      const url = new URL(request.url)
      const fullPath = apiPath + url.search
      return forwardToInternalAPI({
        method: 'PUT',
        path: fullPath,
        request
      })
    },

    async DELETE(request: NextRequest) {
      const url = new URL(request.url)
      const fullPath = apiPath + url.search
      return forwardToInternalAPI({
        method: 'DELETE',
        path: fullPath,
        request
      })
    },

    async PATCH(request: NextRequest) {
      const url = new URL(request.url)
      const fullPath = apiPath + url.search
      return forwardToInternalAPI({
        method: 'PATCH',
        path: fullPath,
        request
      })
    }
  }
}