import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../../proxy-utils'

// Handle GET /api/users/favorites/{id}/status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/users/favorites/${params.id}/status`,
    request
  })
}