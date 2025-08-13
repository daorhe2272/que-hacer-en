import type { MetadataRoute } from 'next'

const cities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:4000'
  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    ...cities.map((c): MetadataRoute.Sitemap[number] => ({ url: `${base}/eventos/${c}`, changeFrequency: 'daily', priority: 0.8 }))
  ]
  return routes
}
