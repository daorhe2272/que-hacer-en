import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../proxy-utils'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return forwardToInternalAPI({
    method: 'GET',
    path: `/api/data-sources/${params.id}`,
    request
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return forwardToInternalAPI({
    method: 'PUT',
    path: `/api/data-sources/${params.id}`,
    request
  })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return forwardToInternalAPI({
    method: 'DELETE',
    path: `/api/data-sources/${params.id}`,
    request
  })
}