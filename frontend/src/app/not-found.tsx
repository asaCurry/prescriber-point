'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Home, ArrowLeft, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Page Not Found | PrescriberPoint',
  description:
    'The page you are looking for could not be found. Please check the URL or navigate back to our homepage.',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Page Not Found | PrescriberPoint',
    description:
      'The page you are looking for could not be found. Please check the URL or navigate back to our homepage.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Page Not Found | PrescriberPoint',
    description:
      'The page you are looking for could not be found. Please check the URL or navigate back to our homepage.',
  },
}

// Force dynamic rendering for SSR-only
export const dynamic = 'force-dynamic'

export default function GlobalNotFound() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
          <p className="text-lg text-gray-600 mb-4">
            Sorry, we couldn't find the page you're looking for.
          </p>
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
              <CardDescription>Find drug information using our search tool</CardDescription>
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
                Search by brand name, generic name, or NDC number
              </p>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle>What can you do?</CardTitle>
              <CardDescription>
                Here are some helpful options to get you back on track
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Check the URL</p>
                    <p className="text-sm text-gray-500">
                      Make sure the web address is spelled correctly.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Go back to the homepage</p>
                    <p className="text-sm text-gray-500">Start fresh from our main page.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Browse our drug database</p>
                    <p className="text-sm text-gray-500">
                      Explore our comprehensive drug information.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to popular sections of our site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium mb-2">Home</h3>
                <p className="text-sm text-gray-500">Return to our homepage</p>
              </Link>
              <Link
                href="/drugs"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium mb-2">Drug Database</h3>
                <p className="text-sm text-gray-500">Browse our comprehensive drug information</p>
              </Link>
              <Link
                href="/search"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium mb-2">Search</h3>
                <p className="text-sm text-gray-500">Find specific drug information</p>
              </Link>
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
              Browse Drugs
            </Link>
          </Button>
          <Button asChild className="flex items-center gap-2">
            <Link href="/">
              <Search className="w-4 h-4" />
              Search
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Need more help?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="ghost" size="sm">
              Contact Support
            </Button>
            <Button variant="ghost" size="sm">
              Report Issue
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
              name: 'Page Not Found - PrescriberPoint',
              description:
                'The page you are looking for could not be found. Please check the URL or navigate back to our homepage.',
              url: typeof window !== 'undefined' ? window.location.href : '/404',
              mainEntity: {
                '@type': 'WebSite',
                name: 'PrescriberPoint',
                url: '/',
                description: 'Comprehensive drug information platform for healthcare professionals',
              },
            }),
          }}
        />
      </div>
    </main>
  )
}
