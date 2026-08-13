import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pahacer.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/admin/', '/favoritos/', '/login/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/admin/', '/favoritos/', '/login/'],
      }
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
