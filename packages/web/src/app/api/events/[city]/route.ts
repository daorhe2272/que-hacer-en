import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../proxy-utils'

// Handle GET /api/events/{city}
export async function GET(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/events/${params.city}`,
    request
  })
}