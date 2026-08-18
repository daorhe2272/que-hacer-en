import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/admin/', '/favoritos/', '/login/', '/crear-evento/', '/editar-evento/', '/mis-eventos/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/admin/', '/favoritos/', '/login/', '/crear-evento/', '/editar-evento/', '/mis-eventos/'],
      }
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
