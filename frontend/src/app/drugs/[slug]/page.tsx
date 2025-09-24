import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionGroup, CollapsibleSection } from '@/components/ui/accordion'
import { DataGrid, InfoCard, PillList } from '@/components/ui/data-display'
import { TextContent, ReadMoreText, HighlightBox } from '@/components/ui/text-content'
import { Drug, normalizeDrugField } from '@/lib/api'
import { RecentPageTracker } from '@/components/recent/recent-page-tracker'
import { RelatedDrugs } from '@/components/drugs/related-drugs'
// import { ProgressiveRelatedDrugs } from '@/components/drugs/progressive-related-drugs'
import { DrugPageHeader } from '@/components/drugs/drug-page-header'
import { Suspense } from 'react'
import {
  generateSEOData,
  generateBreadcrumbData,
  generateSocialMetaTags,
  sanitizeHTML,
} from '@/lib/seo-utils'
import { ErrorBoundary } from '@/components/error-boundary'
import {
  drugNameFallback,
  manufacturerFallback,
  confidenceFallback,
  dateFallback,
  textFallback,
  arrayFallback,
  shouldShowSection,
} from '@/lib/fallbacks'

interface DrugPageProps {
  params: Promise<{
    slug: string // Format: drug-name-ndc (e.g., "lipitor-0071-0155")
  }>
}

// Parse slug to extract drug name and NDC
function parseSlug(slug: string): { drugName: string; ndc: string } {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Invalid slug: slug is required and must be a string')
  }

  const parts = slug.split('-')
  if (parts.length < 2) {
    throw new Error(`Invalid slug format: "${slug}". Expected format: drug-name-ndc`)
  }

  // NDC is typically the last part after the last dash in format like "0071-0155"
  const ndcParts = parts.slice(-2) // Get last 2 parts for NDC
  const drugNameParts = parts.slice(0, -2) // Get all parts before NDC

  const ndc = ndcParts.join('-')
  const drugName = drugNameParts.join('-')

  // Validate that we have both parts
  if (!drugName || !ndc) {
    throw new Error(`Invalid slug format: "${slug}". Could not extract drug name and NDC`)
  }

  return {
    drugName,
    ndc,
  }
}

// This will be called for each request (SSR)
async function getDrugData(slug: string, waitForEnrichment: boolean = false): Promise<Drug | null> {
  try {
    // Validate slug first
    if (!slug || typeof slug !== 'string') {
      console.error('Invalid slug provided:', slug)
      return null
    }

    let drugName: string, ndc: string
    try {
      const parsed = parseSlug(slug)
      drugName = parsed.drugName
      ndc = parsed.ndc
    } catch (error) {
      console.error('Failed to parse slug:', slug, error)
      return null
    }

    // Use internal API URL for SSR to avoid external network calls
    const apiUrl =
      process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    const url = new URL(`${apiUrl}/drugs/${slug}`)
    if (waitForEnrichment) {
      url.searchParams.set('waitForEnrichment', 'true')
    }

    const response = await fetch(url.toString(), {
      // Traditional SSR - no caching, always fetch fresh data
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PrescriberPoint-SSR/1.0',
        'X-Requested-With': 'SSR',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch drug: ${response.status}`)
    }

    const drugData = await response.json()

    if (!drugData || (!drugData.brandName && !drugData.name) || !drugData.ndc) {
      return null
    }

    return drugData
  } catch (error) {
    console.error('Error fetching drug data:', error)
    return null
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DrugPageProps): Promise<Metadata> {
  const resolvedParams = await params
  if (!resolvedParams?.slug) {
    return {
      title: 'Drug Not Found | PrescriberPoint',
      description: 'The requested drug information was not found.',
      robots: 'noindex, nofollow',
    }
  }

  const drug = await getDrugData(resolvedParams.slug)
  console.log('drug', drug)
  if (!drug) {
    return {
      title: 'Drug Not Found | PrescriberPoint',
      description: 'The requested drug information was not found.',
      robots: 'noindex, nofollow',
    }
  }

  // Enhanced title with graceful fallbacks
  const drugName = drug.brandName || drug.name || 'Unknown Drug'
  const title =
    drug.enrichment?.title ||
    drug.aiGeneratedTitle ||
    `${drugName}${drug.genericName ? ` (${drug.genericName})` : ''} - Drug Information | PrescriberPoint`

  // Enhanced description with graceful fallbacks
  const description =
    drug.enrichment?.metaDescription ||
    drug.aiGeneratedMetaDescription ||
    `Comprehensive drug information for ${drugName}${drug.genericName ? ` (${drug.genericName})` : ''}. ` +
      `Manufactured by ${drug.manufacturer}. ` +
      `Includes indications, dosing, contraindications, warnings, and FAQs for healthcare professionals. ` +
      `NDC: ${drug.ndc}`

  // Canonical URL
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'}/drugs/${resolvedParams.slug}`

  return {
    title,
    description,
    keywords: [
      drugName,
      drug.genericName,
      drug.manufacturer,
      'drug information',
      'prescription drug',
      'medication',
      'pharmaceutical',
      'healthcare',
      'prescriber',
      'medical professional',
      drug.ndc,
      ...(drug.enrichment?.keywords || []),
    ]
      .filter((keyword): keyword is string => Boolean(keyword))
      .join(', '),
    authors: [{ name: 'PrescriberPoint Team' }],
    creator: 'PrescriberPoint',
    publisher: 'PrescriberPoint',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      siteName: 'PrescriberPoint',
      locale: 'en_US',
      publishedTime: drug.createdAt,
      modifiedTime: drug.updatedAt,
      authors: ['PrescriberPoint Team'],
      section: 'Drug Information',
      tags: [drug.name, drug.genericName, drug.manufacturer].filter(Boolean) as string[],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@prescriberpoint',
      site: '@prescriberpoint',
    },
    // Enhanced structured data for search engines
    other: {
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Drug',
        name: drugName,
        alternateName: drug.genericName,
        description: description,
        url: canonicalUrl,
        identifier: [
          {
            '@type': 'PropertyValue',
            propertyID: 'NDC',
            value: drug.ndc,
          },
          {
            '@type': 'PropertyValue',
            propertyID: 'Drug ID',
            value: drug.drugId,
          },
          ...(drug.fdaData?.unii?.[0]
            ? [
                {
                  '@type': 'PropertyValue',
                  propertyID: 'UNII',
                  value: drug.fdaData.unii[0],
                },
              ]
            : []),
          ...(drug.fdaData?.rxcui?.[0]
            ? [
                {
                  '@type': 'PropertyValue',
                  propertyID: 'RxCUI',
                  value: drug.fdaData.rxcui[0],
                },
              ]
            : []),
          ...(drug.fdaData?.spl_id?.[0]
            ? [
                {
                  '@type': 'PropertyValue',
                  propertyID: 'SPL ID',
                  value: drug.fdaData.spl_id[0],
                },
              ]
            : []),
        ],
        manufacturer: {
          '@type': 'Organization',
          name: drug.manufacturer,
        },
        indication: drug.indications
          ? [
              {
                '@type': 'MedicalCondition',
                name: drug.indications,
              },
            ]
          : [],
        contraindication: drug.contraindications
          ? [
              {
                '@type': 'MedicalCondition',
                name: drug.contraindications,
              },
            ]
          : [],
        warning: drug.warnings
          ? [
              {
                '@type': 'MedicalSign',
                name: drug.warnings,
              },
            ]
          : [],
        ...(drug.fdaData?.route?.[0] && {
          administrationRoute: drug.fdaData.route,
        }),
        ...(drug.enrichment?.confidenceScore && {
          confidenceScore: drug.enrichment.confidenceScore,
        }),
        ...(drug.enrichment?.updatedAt && {
          dateEnriched: drug.enrichment.updatedAt,
        }),
        dateCreated: drug.createdAt,
        dateModified: drug.updatedAt,
        isPartOf: {
          '@type': 'WebSite',
          name: 'PrescriberPoint',
          url: process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com',
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        ...(drug.enrichment?.aiGeneratedFaqs &&
          drug.enrichment.aiGeneratedFaqs.length > 0 && {
            faq: drug.enrichment.aiGeneratedFaqs.map((faq: any) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
      }),
    },
  }
}

// Loading component for better UX

// Force dynamic rendering for SSR-only
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export default async function DrugPage({ params }: DrugPageProps) {
  // Safety check for params and await if it's a Promise
  const resolvedParams = await params
  if (!resolvedParams?.slug) {
    console.error('No slug provided in params:', resolvedParams)
    notFound()
  }

  // Validate slug format before proceeding
  if (typeof resolvedParams.slug !== 'string' || resolvedParams.slug.trim() === '') {
    console.error('Invalid slug format:', resolvedParams.slug)
    notFound()
  }

  // First, try to get the drug with enrichment (for first-time visits)
  let drug = await getDrugData(resolvedParams.slug, true)

  // If no enrichment data, try without waiting (for cached drugs)
  if (!drug?.enrichment) {
    drug = await getDrugData(resolvedParams.slug, false)
  }

  if (!drug) {
    console.error('Drug not found for slug:', resolvedParams.slug)
    notFound()
  }

  // Debug: Log enrichment data to see what's available
  console.log('Enrichment Debug:', {
    hasEnrichment: !!drug.enrichment,
    enrichmentId: drug.enrichment?.id,
    hasSummary: !!drug.enrichment?.summary,
    hasIndicationSummary: !!drug.enrichment?.indicationSummary,
    hasDosageSummary: !!drug.enrichment?.dosageSummary,
    hasWarningsSummary: !!drug.enrichment?.warningsSummary,
    hasContraindicationsSummary: !!drug.enrichment?.contraindicationsSummary,
    hasSideEffectsSummary: !!drug.enrichment?.sideEffectsSummary,
    hasFaqs: !!drug.enrichment?.aiGeneratedFaqs?.length,
    faqCount: drug.enrichment?.aiGeneratedFaqs?.length || 0,
    hasRelatedConditions: !!drug.enrichment?.relatedConditions?.length,
    relatedConditionsCount: drug.enrichment?.relatedConditions?.length || 0,
    confidenceScore: drug.enrichment?.confidenceScore,
    isPublished: drug.enrichment?.isPublished,
    keywords: drug.enrichment?.keywords?.length || 0,
  })

  // Define drugName with enhanced fallback
  const drugName = drugNameFallback(drug.brandName, drug.genericName, drug.name)

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50">
      {/* Track this page visit */}
      <Suspense fallback={null}>
        <RecentPageTracker drug={drug} slug={resolvedParams.slug} />
      </Suspense>

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Enhanced Header with Breadcrumbs and Quick Actions */}
        <DrugPageHeader drug={drug} className="mb-12" />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Core Information */}
          <div
            className="xl:col-span-2 space-y-6"
            role="main"
            aria-label="Drug information content"
          >
            {/* Essential Information */}
            <AccordionGroup>
              <Accordion
                title="Essential Information"
                category="indication"
                defaultOpen={true}
                pills={[
                  ...(normalizeDrugField(drug.indications)
                    ? [{ label: 'Indications', variant: 'sub-green' as const }]
                    : []),
                  ...(normalizeDrugField(drug.dosage)
                    ? [{ label: 'Dosing', variant: 'sub-blue' as const }]
                    : []),
                  ...(normalizeDrugField(drug.contraindications)
                    ? [{ label: 'Contraindications', variant: 'sub-orange' as const }]
                    : []),
                  ...(normalizeDrugField(drug.warnings)
                    ? [{ label: 'Warnings', variant: 'sub-orange' as const }]
                    : []),
                ]}
              >
                <div className="space-y-4">
                  {/* Count available sections */}
                  {(() => {
                    const sections = [
                      normalizeDrugField(drug.indications),
                      normalizeDrugField(drug.dosage),
                      normalizeDrugField(drug.contraindications),
                      normalizeDrugField(drug.warnings),
                    ].filter(Boolean)
                    const hasMultipleSections = sections.length > 1

                    return (
                      <>
                        {/* Indications */}
                        {normalizeDrugField(drug.indications) && (
                          <CollapsibleSection
                            title="Indications"
                            variant="success"
                            defaultOpen={!hasMultipleSections}
                          >
                            <div className="prose prose-sm max-w-none">
                              <ReadMoreText maxLength={300}>
                                {normalizeDrugField(drug.indications) || ''}
                              </ReadMoreText>
                            </div>
                          </CollapsibleSection>
                        )}

                        {/* Dosage */}
                        {normalizeDrugField(drug.dosage) && (
                          <CollapsibleSection
                            title="Dosage Information"
                            variant="default"
                            defaultOpen={!hasMultipleSections}
                          >
                            <div className="prose prose-sm max-w-none">
                              <ReadMoreText maxLength={300}>
                                {normalizeDrugField(drug.dosage) || ''}
                              </ReadMoreText>
                            </div>
                          </CollapsibleSection>
                        )}

                        {/* Contraindications */}
                        {normalizeDrugField(drug.contraindications) && (
                          <CollapsibleSection
                            title="Contraindications"
                            variant="danger"
                            defaultOpen={!hasMultipleSections}
                          >
                            <div className="prose prose-sm max-w-none">
                              <ReadMoreText maxLength={300}>
                                {normalizeDrugField(drug.contraindications) || ''}
                              </ReadMoreText>
                            </div>
                          </CollapsibleSection>
                        )}

                        {/* Warnings */}
                        {normalizeDrugField(drug.warnings) && (
                          <CollapsibleSection
                            title="Warnings"
                            variant="warning"
                            defaultOpen={!hasMultipleSections}
                          >
                            <div className="prose prose-sm max-w-none">
                              <ReadMoreText maxLength={300}>
                                {normalizeDrugField(drug.warnings) || ''}
                              </ReadMoreText>
                            </div>
                          </CollapsibleSection>
                        )}
                      </>
                    )
                  })()}
                </div>
              </Accordion>

              {/* FDA Data Sections */}
              {drug.fdaData && (
                <>
                  <Accordion
                    title="FDA Safety Information"
                    pills={[
                      ...(drug.fdaData.pregnancy?.length
                        ? [{ label: 'Pregnancy', variant: 'sub-orange' as const }]
                        : []),
                      ...(drug.fdaData.overdosage?.length
                        ? [{ label: 'Overdose', variant: 'sub-orange' as const }]
                        : []),
                      ...(drug.fdaData.drug_abuse_and_dependence?.length
                        ? [{ label: 'Abuse', variant: 'sub-blue' as const }]
                        : []),
                      ...(drug.fdaData.adverse_reactions?.length
                        ? [{ label: 'Adverse Reactions', variant: 'sub-orange' as const }]
                        : []),
                      ...(drug.fdaData.clinical_pharmacology?.length
                        ? [{ label: 'Clinical Pharmacology', variant: 'sub-blue' as const }]
                        : []),
                    ]}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const sections = [
                          drug.fdaData.pregnancy?.length,
                          drug.fdaData.overdosage?.length,
                          drug.fdaData.drug_abuse_and_dependence?.length,
                          drug.fdaData.adverse_reactions?.length,
                          drug.fdaData.clinical_pharmacology?.length,
                        ].filter(Boolean)
                        const hasMultipleSections = sections.length > 1

                        return (
                          <>
                            {drug.fdaData.pregnancy && drug.fdaData.pregnancy.length > 0 && (
                              <CollapsibleSection
                                title="Pregnancy Information"
                                variant="warning"
                                defaultOpen={!hasMultipleSections}
                              >
                                <div className="space-y-2">
                                  {drug.fdaData.pregnancy.map((item: string, index: number) => (
                                    <p key={index} className="text-sm">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleSection>
                            )}

                            {drug.fdaData.overdosage && drug.fdaData.overdosage.length > 0 && (
                              <CollapsibleSection
                                title="Overdosage"
                                variant="danger"
                                defaultOpen={!hasMultipleSections}
                              >
                                <div className="space-y-2">
                                  {drug.fdaData.overdosage.map((item: string, index: number) => (
                                    <p key={index} className="text-sm">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleSection>
                            )}

                            {drug.fdaData.drug_abuse_and_dependence &&
                              drug.fdaData.drug_abuse_and_dependence.length > 0 && (
                                <CollapsibleSection
                                  title="Drug Abuse and Dependence"
                                  variant="warning"
                                  defaultOpen={!hasMultipleSections}
                                >
                                  <div className="space-y-2">
                                    {drug.fdaData.drug_abuse_and_dependence.map(
                                      (item: string, index: number) => (
                                        <p key={index} className="text-sm">
                                          {item}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </CollapsibleSection>
                              )}

                            {drug.fdaData.adverse_reactions &&
                              drug.fdaData.adverse_reactions.length > 0 && (
                                <CollapsibleSection
                                  title="Adverse Reactions"
                                  variant="danger"
                                  defaultOpen={!hasMultipleSections}
                                >
                                  <div className="space-y-2">
                                    {drug.fdaData.adverse_reactions.map(
                                      (item: string, index: number) => (
                                        <p key={index} className="text-sm">
                                          {item}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </CollapsibleSection>
                              )}

                            {drug.fdaData.clinical_pharmacology &&
                              drug.fdaData.clinical_pharmacology.length > 0 && (
                                <CollapsibleSection
                                  title="Clinical Pharmacology"
                                  variant="default"
                                  defaultOpen={!hasMultipleSections}
                                >
                                  <div className="space-y-2">
                                    {drug.fdaData.clinical_pharmacology.map(
                                      (item: string, index: number) => (
                                        <p key={index} className="text-sm">
                                          {item}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </CollapsibleSection>
                              )}
                          </>
                        )
                      })()}
                    </div>
                  </Accordion>

                  <Accordion
                    title="Product Details"
                    pills={[
                      ...(drug.fdaData.description?.length
                        ? [{ label: 'Description', variant: 'sub-blue' as const }]
                        : []),
                      ...(drug.fdaData.how_supplied?.length
                        ? [{ label: 'Supply', variant: 'sub-green' as const }]
                        : []),
                      ...(drug.fdaData.active_ingredient?.length
                        ? [{ label: 'Active Ingredients', variant: 'sub-blue' as const }]
                        : []),
                      ...(drug.fdaData.inactive_ingredient?.length
                        ? [{ label: 'Inactive Ingredients', variant: 'sub-purple' as const }]
                        : []),
                      ...(drug.fdaData.purpose?.length
                        ? [{ label: 'Purpose', variant: 'sub-green' as const }]
                        : []),
                    ]}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const sections = [
                          drug.fdaData.description?.length,
                          drug.fdaData.how_supplied?.length,
                          drug.fdaData.active_ingredient?.length,
                          drug.fdaData.inactive_ingredient?.length,
                          drug.fdaData.purpose?.length,
                        ].filter(Boolean)
                        const hasMultipleSections = sections.length > 1

                        return (
                          <>
                            {drug.fdaData.description && drug.fdaData.description.length > 0 && (
                              <CollapsibleSection
                                title="Description"
                                variant="default"
                                defaultOpen={!hasMultipleSections}
                              >
                                <div className="space-y-2">
                                  {drug.fdaData.description.map((item: string, index: number) => (
                                    <p key={index} className="text-sm">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleSection>
                            )}

                            {drug.fdaData.how_supplied && drug.fdaData.how_supplied.length > 0 && (
                              <CollapsibleSection
                                title="How Supplied"
                                variant="success"
                                defaultOpen={!hasMultipleSections}
                              >
                                <div className="space-y-2">
                                  {drug.fdaData.how_supplied.map((item: string, index: number) => (
                                    <p key={index} className="text-sm">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleSection>
                            )}

                            {drug.fdaData.active_ingredient &&
                              drug.fdaData.active_ingredient.length > 0 && (
                                <CollapsibleSection
                                  title="Active Ingredients"
                                  variant="default"
                                  defaultOpen={!hasMultipleSections}
                                >
                                  <div className="space-y-2">
                                    {drug.fdaData.active_ingredient.map(
                                      (item: string, index: number) => (
                                        <p key={index} className="text-sm">
                                          {item}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </CollapsibleSection>
                              )}

                            {drug.fdaData.inactive_ingredient &&
                              drug.fdaData.inactive_ingredient.length > 0 && (
                                <CollapsibleSection
                                  title="Inactive Ingredients"
                                  variant="default"
                                  defaultOpen={!hasMultipleSections}
                                >
                                  <div className="space-y-2">
                                    {drug.fdaData.inactive_ingredient.map(
                                      (item: string, index: number) => (
                                        <p key={index} className="text-sm">
                                          {item}
                                        </p>
                                      )
                                    )}
                                  </div>
                                </CollapsibleSection>
                              )}

                            {drug.fdaData.purpose && drug.fdaData.purpose.length > 0 && (
                              <CollapsibleSection
                                title="Purpose"
                                variant="success"
                                defaultOpen={!hasMultipleSections}
                              >
                                <div className="space-y-2">
                                  {drug.fdaData.purpose.map((item: string, index: number) => (
                                    <p key={index} className="text-sm">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleSection>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </Accordion>
                </>
              )}

              {/* AI-Generated Summaries */}
              {drug.enrichment && (
                <Accordion
                  title="AI-Enhanced Information"
                  category="indication"
                  pills={[
                    ...(drug.enrichment.summary
                      ? [{ label: 'Summary', variant: 'sub-blue' as const }]
                      : []),
                    ...(drug.enrichment.indicationSummary
                      ? [{ label: 'Indications', variant: 'sub-green' as const }]
                      : []),
                    ...(drug.enrichment.dosageSummary
                      ? [{ label: 'Dosing', variant: 'sub-blue' as const }]
                      : []),
                    ...(drug.enrichment.warningsSummary
                      ? [{ label: 'Warnings', variant: 'sub-orange' as const }]
                      : []),
                    ...(drug.enrichment.contraindicationsSummary
                      ? [{ label: 'Contraindications', variant: 'sub-orange' as const }]
                      : []),
                    ...(drug.enrichment.sideEffectsSummary
                      ? [{ label: 'Side Effects', variant: 'sub-purple' as const }]
                      : []),
                  ]}
                >
                  <div className="space-y-4">
                    {(() => {
                      const sections = [
                        drug.enrichment.summary,
                        drug.enrichment.indicationSummary,
                        drug.enrichment.dosageSummary,
                        drug.enrichment.warningsSummary,
                        drug.enrichment.contraindicationsSummary,
                        drug.enrichment.sideEffectsSummary,
                      ].filter(Boolean)
                      const hasMultipleSections = sections.length > 1

                      return (
                        <>
                          {/* Professional Summary */}
                          {drug.enrichment.summary && (
                            <CollapsibleSection
                              title="Professional Summary"
                              variant="success"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={500}>
                                  {drug.enrichment.summary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}

                          {/* Enhanced Indications */}
                          {drug.enrichment.indicationSummary && (
                            <CollapsibleSection
                              title="Enhanced Indications"
                              variant="success"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={400}>
                                  {drug.enrichment.indicationSummary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}

                          {/* Enhanced Dosage */}
                          {drug.enrichment.dosageSummary && (
                            <CollapsibleSection
                              title="Enhanced Dosing Information"
                              variant="default"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={400}>
                                  {drug.enrichment.dosageSummary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}

                          {/* Enhanced Warnings */}
                          {drug.enrichment.warningsSummary && (
                            <CollapsibleSection
                              title="Enhanced Warnings"
                              variant="warning"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={400}>
                                  {drug.enrichment.warningsSummary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}

                          {/* Enhanced Contraindications */}
                          {drug.enrichment.contraindicationsSummary && (
                            <CollapsibleSection
                              title="Enhanced Contraindications"
                              variant="danger"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={400}>
                                  {drug.enrichment.contraindicationsSummary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}

                          {/* Side Effects Summary */}
                          {drug.enrichment.sideEffectsSummary && (
                            <CollapsibleSection
                              title="Side Effects Summary"
                              variant="warning"
                              defaultOpen={!hasMultipleSections}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReadMoreText maxLength={400}>
                                  {drug.enrichment.sideEffectsSummary}
                                </ReadMoreText>
                              </div>
                            </CollapsibleSection>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </Accordion>
              )}

              {/* AI Generated FAQs */}
              {((drug.enrichment?.aiGeneratedFaqs && drug.enrichment.aiGeneratedFaqs.length > 0) ||
                (drug.aiGeneratedFaqs && Array.isArray(drug.aiGeneratedFaqs))) && (
                <Accordion title="Frequently Asked Questions">
                  <div className="space-y-4">
                    {(drug.enrichment?.aiGeneratedFaqs || drug.aiGeneratedFaqs || []).map(
                      (faq: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-4">
                          <h4 className="font-semibold text-foreground mb-2">{faq.question}</h4>
                          <p className="text-muted-foreground text-sm">{faq.answer}</p>
                        </div>
                      )
                    )}
                  </div>
                </Accordion>
              )}
            </AccordionGroup>
          </div>

          {/* Right Column - Additional Information */}
          <div className="space-y-6" role="complementary" aria-label="Additional drug information">
            {/* Enrichment Status */}
            {drug.enrichment && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drug.enrichment.confidenceScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Confidence Score
                      </span>
                      <Badge
                        variant={
                          drug.enrichment.confidenceScore >= 0.8
                            ? 'status-approved'
                            : drug.enrichment.confidenceScore >= 0.6
                              ? 'status-warning'
                              : 'status-critical'
                        }
                        size="sm"
                      >
                        {Math.round(drug.enrichment.confidenceScore * 100)}%
                      </Badge>
                    </div>
                  )}

                  {drug.enrichment.aiModelVersion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">AI Model</span>
                      <span className="text-sm text-foreground">
                        {drug.enrichment.aiModelVersion}
                      </span>
                    </div>
                  )}

                  {drug.enrichment.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Enriched</span>
                      <span className="text-sm text-foreground">
                        {new Date(drug.enrichment.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {drug.enrichment.keywords && drug.enrichment.keywords.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground mb-2 block">
                        Keywords
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {drug.enrichment.keywords.slice(0, 5).map((keyword, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {keyword}
                          </Badge>
                        ))}
                        {drug.enrichment.keywords.length > 5 && (
                          <Badge variant="outline" size="sm">
                            +{drug.enrichment.keywords.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Identifiers */}
            {drug.fdaData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Drug Identifiers</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataGrid
                    data={[
                      { label: 'NDC', value: drug.ndc },
                      { label: 'Drug ID', value: drug.drugId },
                      ...(drug.fdaData.unii?.[0]
                        ? [{ label: 'UNII', value: drug.fdaData.unii[0] }]
                        : []),
                      ...(drug.fdaData.rxcui?.[0]
                        ? [{ label: 'RxCUI', value: drug.fdaData.rxcui[0] }]
                        : []),
                      ...(drug.fdaData.spl_id?.[0]
                        ? [{ label: 'SPL ID', value: drug.fdaData.spl_id[0] }]
                        : []),
                    ]}
                  />
                </CardContent>
              </Card>
            )}

            {/* Related Drugs Component */}
            <RelatedDrugs relatedDrugs={drug.relatedDrugs || []} />

            {/* Related Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Related Conditions */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Related Conditions
                  </h3>
                  <PillList
                    items={drug.enrichment?.relatedConditions}
                    variant="colorful"
                    fallbackText="Conditions will be identified during AI enrichment"
                  />
                </div>

                {/* Routes of Administration */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Routes</h3>
                  <PillList
                    items={drug.fdaData?.route}
                    variant="colorful"
                    fallbackText="Administration routes not specified"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="mt-12 text-center text-sm text-muted-foreground border-t pt-6"
          role="contentinfo"
        >
          <p>
            This information is sourced from FDA drug labels and enhanced with AI for better
            readability. Always consult with healthcare professionals for medical advice.
          </p>
        </footer>
      </div>
    </div>
  )
}

// SSR: No static generation needed
