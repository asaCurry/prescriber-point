import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Drug } from '@/lib/api'

interface DrugPageProps {
  params: {
    slug: string // Format: drug-name-ndc (e.g., "lipitor-0071-0155")
  }
}

// Parse slug to extract drug name and NDC
function parseSlug(slug: string): { drugName: string; ndc: string } {
  const parts = slug.split('-')
  // NDC is typically the last part after the last dash in format like "0071-0155"
  const ndcParts = parts.slice(-2) // Get last 2 parts for NDC
  const drugNameParts = parts.slice(0, -2) // Get all parts before NDC

  return {
    drugName: drugNameParts.join('-'),
    ndc: ndcParts.join('-'),
  }
}

// This will be called at build time and for ISR
async function getDrugData(slug: string): Promise<Drug | null> {
  try {
    const { drugName, ndc } = parseSlug(slug)

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/drugs/${slug}`,
      {
        next: {
          revalidate: 604800, // Revalidate every week (7 days * 24 hours * 60 minutes * 60 seconds)
          tags: [`drug-${slug}`, `drug-name-${drugName}`, `ndc-${ndc}`], // Multiple tags for flexible revalidation
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        // Don't cache 404 responses - return null without caching
        return null
      }
      throw new Error(`Failed to fetch drug: ${response.status}`)
    }

    const drugData = await response.json()

    // Don't cache empty or incomplete drug data
    if (!drugData || !drugData.name || !drugData.ndc) {
      return null
    }

    return drugData
  } catch (error) {
    console.error('Error fetching drug data:', error)
    // Don't cache errors - return null so ISR doesn't cache failed attempts
    return null
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DrugPageProps): Promise<Metadata> {
  const drug = await getDrugData(params.slug)

  if (!drug) {
    return {
      title: 'Drug Not Found | PrescriberPoint',
      description: 'The requested drug information was not found.',
    }
  }

  const title = drug.aiGeneratedTitle || `${drug.name} - Drug Information | PrescriberPoint`
  const description =
    drug.aiGeneratedMetaDescription ||
    `Comprehensive information about ${drug.name}${drug.genericName ? ` (${drug.genericName})` : ''} including indications, dosing, and warnings for healthcare professionals.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/drugs/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    // Add structured data for search engines
    other: {
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Drug',
        name: drug.name,
        alternateName: drug.genericName,
        manufacturer: {
          '@type': 'Organization',
          name: drug.manufacturer,
        },
        description: description,
        url: `/drugs/${params.slug}`,
      }),
    },
  }
}

export default async function DrugPage({ params }: DrugPageProps) {
  const drug = await getDrugData(params.slug)

  if (!drug) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{drug.name}</h1>
          {drug.genericName && (
            <p className="text-lg text-muted-foreground mb-4">Generic: {drug.genericName}</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-muted-foreground">Manufactured by {drug.manufacturer}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                NDC: {drug.ndc}
              </Badge>
            </div>
          </div>
        </div>

        {/* AI Generated Content */}
        {drug.aiGeneratedContent && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div dangerouslySetInnerHTML={{ __html: drug.aiGeneratedContent }} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Indications */}
          {drug.indications && drug.indications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Indications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {drug.indications.map((indication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span>{indication}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Dosing */}
          {drug.dosing && (
            <Card>
              <CardHeader>
                <CardTitle>Dosing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{drug.dosing}</p>
              </CardContent>
            </Card>
          )}

          {/* Contraindications */}
          {drug.contraindications && drug.contraindications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Contraindications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {drug.contraindications.map((contraindication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-destructive rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span>{contraindication}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {drug.warnings && drug.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {drug.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Generated FAQs */}
        {drug.aiGeneratedFaqs && Array.isArray(drug.aiGeneratedFaqs) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {drug.aiGeneratedFaqs.map((faq: any, index: number) => (
                  <div key={index}>
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Drugs */}
        {drug.relatedDrugs && drug.relatedDrugs.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Related Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {drug.relatedDrugs.map((relatedDrug, index) => (
                  <Badge key={index} variant="secondary">
                    {relatedDrug}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Updated */}
        <div className="mt-8 text-sm text-muted-foreground text-center">
          <p>Last updated: {new Date(drug.updatedAt).toLocaleDateString()}</p>
          <p>Information sourced from FDA drug labels and enhanced with AI</p>
        </div>
      </div>
    </main>
  )
}

// For ISR: This tells Next.js which pages to pre-build at build time
export async function generateStaticParams() {
  // We'll start with an empty array since pages will be generated on-demand
  // Later, we could pre-generate popular drugs
  return []
}

// Use blocking fallback - users wait for full page generation
export const dynamicParams = true
