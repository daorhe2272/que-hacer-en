import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../proxy-utils'

// Handle individual event management operations by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/events/manage/${params.id}`,
    request
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'PUT',
    path: `/api/events/${params.id}`,
    request
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'DELETE',
    path: `/api/events/${params.id}`,
    request
  })
}