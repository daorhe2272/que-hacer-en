import { createProxyHandler } from '../../proxy-utils'

// Proxy to /api/users/me endpoint
const handler = createProxyHandler('/api/users/me')

export const GET = handler.GET