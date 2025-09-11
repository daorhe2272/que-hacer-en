import { createProxyHandler } from '../../proxy-utils'

// Proxy to /api/users/favorites endpoint
const handler = createProxyHandler('/api/users/favorites')

export const GET = handler.GET
export const POST = handler.POST