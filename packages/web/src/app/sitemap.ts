import type { MetadataRoute } from 'next'

const cities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:4000'
  
  const routes: MetadataRoute.Sitemap = [
    // Main pages
    {
      url: `${base}/`,
      changeFrequency: 'daily',
      priority: 1,
      lastModified: new Date()
    },
    // City pages
    ...cities.map((city): MetadataRoute.Sitemap[number] => ({ 
      url: `${base}/eventos/${city}`, 
      changeFrequency: 'daily', 
      priority: 0.9,
      lastModified: new Date()
    }))
  ]
  
  return routes
}
