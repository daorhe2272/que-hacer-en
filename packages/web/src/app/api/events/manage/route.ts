import { createProxyHandler } from '../../proxy-utils'

// Proxy to /api/events/manage endpoint
const handler = createProxyHandler('/api/events/manage')

export const GET = handler.GET
export const POST = handler.POST
export const PUT = handler.PUT
export const DELETE = handler.DELETE