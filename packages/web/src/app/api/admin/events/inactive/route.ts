import { createProxyHandler } from '../../../proxy-utils'

const handler = createProxyHandler('/api/admin/events/inactive')

export const GET = handler.GET