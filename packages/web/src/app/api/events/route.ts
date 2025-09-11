import { createProxyHandler } from '../proxy-utils'

// Proxy to /api/events endpoint
const handler = createProxyHandler('/api/events')

export const GET = handler.GET
export const POST = handler.POST