import { createProxyHandler } from '../proxy-utils'

export const { GET, POST } = createProxyHandler('/api/data-sources')