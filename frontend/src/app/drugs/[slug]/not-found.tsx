'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Home, ArrowLeft, AlertTriangle } from 'lucide-react'
import { generateErrorSEOData } from '@/lib/seo-utils'
import { Search404, QuickSearchSuggestions } from '@/components/search/404-search'

interface NotFoundPageProps {
  params: {
    slug: string
  }
}

// Generate SEO metadata for 404 page
export async function generateMetadata({ params }: NotFoundPageProps): Promise<Metadata> {
  const seoData = generateErrorSEOData('not-found')

  return {
    title: seoData.title,
    description: seoData.description,
    robots: seoData.robots,
    alternates: {
      canonical: seoData.canonicalUrl,
    },
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      type: 'website',
      url: seoData.canonicalUrl,
    },
    twitter: {
      card: 'summary',
      title: seoData.title,
      description: seoData.description,
    },
  }
}

export default function DrugNotFound({ params }: NotFoundPageProps) {
  // Extract drug name from slug for better UX
  const drugNameFromSlug = params.slug
    .split('-')
    .slice(0, -2) // Remove NDC parts
    .join(' ')
    .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize words

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Drug Not Found</h1>
          <p className="text-lg text-gray-600 mb-4">
            We couldn't find information for "{drugNameFromSlug}"
          </p>
          <Badge variant="outline" className="text-sm">
            NDC: {params.slug.split('-').slice(-2).join('-')}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for Drugs
              </CardTitle>
              <CardDescription>
                Find the drug you're looking for using our search tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for a drug name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button className="px-4">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Try searching by brand name, generic name, or NDC number
              </p>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Here are some ways to find what you're looking for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Check the spelling</p>
                    <p className="text-sm text-gray-500">
                      Drug names can be tricky. Try different spellings or abbreviations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Try the generic name</p>
                    <p className="text-sm text-gray-500">
                      Search using the generic (active ingredient) name instead of the brand name.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Use the NDC number</p>
                    <p className="text-sm text-gray-500">
                      Enter the 11-digit NDC number if you have it.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Drugs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Popular Medications</CardTitle>
            <CardDescription>Browse some commonly searched drugs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Lipitor', slug: 'lipitor-0071-0155' },
                { name: 'Metformin', slug: 'metformin-500mg-0011' },
                { name: 'Lisinopril', slug: 'lisinopril-10mg-0022' },
                { name: 'Atorvastatin', slug: 'atorvastatin-20mg-0033' },
              ].map((drug) => (
                <Link
                  key={drug.slug}
                  href={`/drugs/${drug.slug}`}
                  className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm">{drug.name}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/drugs">
              <ArrowLeft className="w-4 h-4" />
              Browse All Drugs
            </Link>
          </Button>
          <Button asChild className="flex items-center gap-2">
            <Link href="/">
              <Search className="w-4 h-4" />
              Search Drugs
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Still can't find what you're looking for?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="ghost" size="sm">
              Contact Support
            </Button>
            <Button variant="ghost" size="sm">
              Report Missing Drug
            </Button>
          </div>
        </div>

        {/* SEO Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Drug Not Found - PrescriberPoint',
              description:
                "The requested drug information was not found. Please check the URL or search for the drug you're looking for.",
              url: `/drugs/${params.slug}`,
              mainEntity: {
                '@type': 'Drug',
                name: drugNameFromSlug,
                description: `Information for ${drugNameFromSlug} was not found in our database.`,
              },
              breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: '/',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Drugs',
                    item: '/drugs',
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: 'Not Found',
                    item: `/drugs/${params.slug}`,
                  },
                ],
              },
            }),
          }}
        />
      </div>
    </main>
  )
}
