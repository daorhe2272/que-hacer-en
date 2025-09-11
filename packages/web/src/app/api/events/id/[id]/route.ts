import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../proxy-utils'

// Handle GET /api/events/id/{id}
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/events/id/${params.id}`,
    request
  })
}