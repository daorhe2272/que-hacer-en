import { createProxyHandler } from '../../proxy-utils'

const handler = createProxyHandler('/api/admin/stats')

export const GET = handler.GET

