import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/drugs`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ]

  // Dynamic drug pages - fetch from API
  let drugPages: MetadataRoute.Sitemap = []

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/drugs/slugs`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PrescriberPoint-Sitemap/1.0',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (response.ok) {
      const drugSlugs = await response.json()

      drugPages = drugSlugs.map((slug: string) => ({
        url: `${baseUrl}/drugs/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))

      console.log(`Generated sitemap with ${drugPages.length} drug pages`)
    } else {
      console.warn(`Failed to fetch drug slugs: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error fetching drug slugs for sitemap:', error)
    // Continue with empty drug pages array
  }

  return [...staticPages, ...drugPages]
}
