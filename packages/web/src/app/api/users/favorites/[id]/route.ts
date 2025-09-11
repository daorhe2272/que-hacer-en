import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../proxy-utils'

// Handle DELETE /api/users/favorites/{id}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return forwardToInternalAPI({
    method: 'DELETE',
    path: `/api/users/favorites/${params.id}`,
    request
  })
}