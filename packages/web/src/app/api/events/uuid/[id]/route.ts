import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../proxy-utils'

// Handle individual event operations by UUID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/events/uuid/${params.id}`,
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