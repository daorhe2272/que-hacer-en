import { NextRequest } from 'next/server'
import { forwardToInternalAPI } from '../../../proxy-utils'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return forwardToInternalAPI({
    method: 'POST',
    path: `/api/data-sources/${params.id}/mine`,
    request
  })
}