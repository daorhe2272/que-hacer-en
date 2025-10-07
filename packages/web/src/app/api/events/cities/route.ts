import { createProxyHandler } from '../../proxy-utils'

const handler = createProxyHandler('/api/events/cities')

export const GET = handler.GET