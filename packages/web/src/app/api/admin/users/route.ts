import { createProxyHandler } from '../../proxy-utils'

const handler = createProxyHandler('/api/admin/users')

export const GET = handler.GET
