'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TypeAheadSearch } from '@/components/search/type-ahead-search'
import { DrugSearchResult } from '@/lib/api'

function generateDrugSlug(brandName: string, ndc: string): string {
  const cleanName = brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  const cleanNDC = ndc.replace(/[^0-9-]/g, '')
  return `${cleanName}-${cleanNDC}`
}

export default function Home() {
  const router = useRouter()

  const handleDrugSelect = (result: DrugSearchResult) => {
    if (result.source === 'local') {
      // Navigate to existing drug page
      const slug = generateDrugSlug(result.brandName, result.ndc)
      router.push(`/drugs/${slug}`)
    } else {
      // For FDA results, we would trigger the ISR page generation
      // The backend would need to fetch from FDA API and process with AI
      const slug = generateDrugSlug(result.brandName, result.ndc)
      router.push(`/drugs/${slug}`)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">PrescriberPoint</h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-Enhanced Drug Information Platform for Healthcare Professionals
          </p>

          {/* Type-Ahead Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <TypeAheadSearch
              placeholder="Search drugs by name or NDC (min 3 characters)..."
              onResultSelect={handleDrugSelect}
            />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Drug Database</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive FDA-approved drug information with AI-enhanced content
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced search capabilities across drugs and medical conditions
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Optimized</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                High-performance pages optimized for search engines and Core Web Vitals
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
