'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DrugSearchResult, drugsApi } from '@/lib/api'

// Dynamically import client components to prevent SSR issues
const TypeAheadSearch = dynamicImport(
  () =>
    import('@/components/search/type-ahead-search').then((mod) => ({
      default: mod.TypeAheadSearch,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-12 bg-gray-100 rounded-lg" />,
  }
)

const RecentlyViewed = dynamicImport(
  () =>
    import('@/components/recent/recently-viewed').then((mod) => ({ default: mod.RecentlyViewed })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />,
  }
)

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

const FeatureCard = ({ title, description, icon }: FeatureCardProps) => {
  return (
    <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <CardTitle className="text-primary">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

const generateDrugSlug = (brandName: string, ndc: string): string => {
  const cleanName = brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  const cleanNDC = ndc.replace(/[^0-9-]/g, '')
  return `${cleanName}-${cleanNDC}`
}

const features = [
  {
    title: 'AI-Enhanced Database',
    description:
      'FDA drug data enriched with AI-generated summaries and insights, stored for fast access',
    icon: (
      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    title: 'Intelligent Search',
    description:
      'Search our curated database and discover new drugs from the FDA catalog with AI processing',
    icon: (
      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
    ),
  },
  {
    title: 'Recent History',
    description: 'Quick access to recently viewed drug pages stored locally in your browser',
    icon: (
      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z" />
      </svg>
    ),
  },
]

// Force dynamic rendering to avoid SSG issues
export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()

  const handleDrugSelect = async (result: DrugSearchResult) => {
    const slug = generateDrugSlug(result.brandName, result.ndc)

    if (result.source === 'local') {
      // Navigate to existing drug page (data already in database)
      router.push(`/drugs/${slug}`)
    } else {
      // For FDA results, fetch and store in database, then navigate
      try {
        console.log(`Processing ${result.brandName}...`)

        // This will fetch from FDA API, process with AI, and store in database
        await drugsApi.fetchAndCache(result.ndc)

        // Navigate to the page (SSR will fetch from database)
        router.push(`/drugs/${slug}`)
      } catch (error) {
        console.error('Failed to process drug:', error)

        // Show user-friendly error message
        alert(
          `Unable to process ${result.brandName}. Please try again or contact support if the issue persists.`
        )

        // Still navigate - SSR will handle gracefully if data isn't ready
        router.push(`/drugs/${slug}`)
      }
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-foreground"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-foreground">Prescriber Point</h1>
            </div>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-4"></div>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            AI-Enhanced Drug Information Platform for Healthcare Professionals
          </p>

          {/* Type-Ahead Search */}
          <div className="max-w-2xl mx-auto">
            <TypeAheadSearch
              placeholder="Search drugs by name or NDC (min 3 characters)..."
              onResultSelect={handleDrugSelect}
            />
          </div>
        </div>

        {/* Recently Viewed Section */}
        <div className="mb-12">
          <RecentlyViewed maxItems={6} />
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
