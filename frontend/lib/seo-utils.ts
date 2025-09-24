import { Drug } from './api'

/**
 * Utility functions for SEO optimization with graceful fallbacks
 */

export interface SEOData {
  title: string
  description: string
  keywords: string[]
  canonicalUrl: string
  structuredData: Record<string, any>
}

/**
 * Generate SEO data with graceful fallbacks for missing server-side fields
 */
export function generateSEOData(drug: Drug, slug: string): SEOData {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'
  const canonicalUrl = `${baseUrl}/drugs/${slug}`

  // Enhanced title with graceful fallbacks
  const title =
    drug.aiGeneratedTitle ||
    `${drug.name}${drug.genericName ? ` (${drug.genericName})` : ''} - Drug Information | PrescriberPoint`

  // Enhanced description with graceful fallbacks
  const description =
    drug.aiGeneratedMetaDescription ||
    `Comprehensive drug information for ${drug.name}${drug.genericName ? ` (${drug.genericName})` : ''}. ` +
      `Manufactured by ${drug.manufacturer}. ` +
      `Includes indications, dosing, contraindications, warnings, and FAQs for healthcare professionals. ` +
      `NDC: ${drug.ndc}`

  // Keywords with graceful fallbacks
  const keywords = [
    drug.name,
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
    // Add indication-based keywords if available
    ...(drug.indications ? [drug.indications] : []),
  ].filter((keyword): keyword is string => Boolean(keyword))

  // Enhanced structured data with graceful fallbacks
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: drug.name,
    alternateName: drug.genericName,
    description: description,
    url: canonicalUrl,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'NDC',
      value: drug.ndc,
    },
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
    dateCreated: drug.createdAt,
    dateModified: drug.updatedAt,
    isPartOf: {
      '@type': 'WebSite',
      name: 'PrescriberPoint',
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    // Add FAQ structured data if available
    ...(drug.aiGeneratedFaqs &&
      Array.isArray(drug.aiGeneratedFaqs) && {
        mainEntity: {
          '@type': 'FAQPage',
          mainEntity: drug.aiGeneratedFaqs.map((faq: any) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
      }),
  }

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    structuredData,
  }
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbData(slug: string, drugName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Drugs',
        item: `${baseUrl}/drugs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: drugName,
        item: `${baseUrl}/drugs/${slug}`,
      },
    ],
  }
}

/**
 * Generate error page SEO data
 */
export function generateErrorSEOData(type: 'not-found' | 'error' = 'not-found') {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'

  if (type === 'not-found') {
    return {
      title: 'Drug Not Found | PrescriberPoint',
      description:
        "The requested drug information was not found. Please check the URL or search for the drug you're looking for.",
      canonicalUrl: `${baseUrl}/404`,
      robots: 'noindex, nofollow',
    }
  }

  return {
    title: 'Error | PrescriberPoint',
    description: 'An error occurred while loading the page. Please try again later.',
    canonicalUrl: `${baseUrl}/500`,
    robots: 'noindex, nofollow',
  }
}

/**
 * Validate and sanitize HTML content for safe rendering
 */
export function sanitizeHTML(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Generate meta tags for social sharing
 */
export function generateSocialMetaTags(seoData: SEOData, drug: Drug) {
  return {
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      type: 'article',
      url: seoData.canonicalUrl,
      siteName: 'PrescriberPoint',
      locale: 'en_US',
      publishedTime: drug.createdAt,
      modifiedTime: drug.updatedAt,
      authors: ['PrescriberPoint Team'],
      section: 'Drug Information',
      tags: [drug.name, drug.genericName, drug.manufacturer].filter(Boolean),
    },
    twitter: {
      card: 'summary_large_image',
      title: seoData.title,
      description: seoData.description,
      creator: '@prescriberpoint',
      site: '@prescriberpoint',
    },
  }
}
