import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface DrugEnrichment {
  id: number
  drugId: number
  // SEO fields
  title?: string
  metaDescription?: string
  slug?: string
  canonicalUrl?: string
  structuredData?: any
  // Human-readable content
  summary?: string
  indicationSummary?: string
  sideEffectsSummary?: string
  dosageSummary?: string
  warningsSummary?: string
  contraindicationsSummary?: string
  // Enhanced content sections
  aiGeneratedFaqs?: Array<{ question: string; answer: string }>
  relatedDrugs?: string[]
  relatedConditions?: string[]
  keywords?: string[]
  // Content quality metrics
  aiModelVersion?: string
  promptVersion?: string
  confidenceScore?: number
  contentHash?: string
  // Content flags
  isReviewed: boolean
  isPublished: boolean
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface RelatedDrug {
  id: number
  name: string
  ndc?: string
  brandName?: string
  genericName?: string
  manufacturer?: string
  indication?: string
  description?: string
  relationshipType?: string
  confidenceScore?: number
  createdAt: string
  updatedAt: string
}

export interface Drug {
  id: number
  drugId: string // This serves as the slug
  brandName: string
  genericName?: string
  manufacturer: string
  ndc: string
  dataSource: string
  fdaData?: any
  dataVersion?: string
  // Drug detail fields from FDA
  indications?: string | string[]
  contraindications?: string | string[]
  dosage?: string | string[]
  warnings?: string | string[]
  description?: string
  // Enrichment relationship
  enrichment?: DrugEnrichment
  // Related drugs from database
  relatedDrugs?: RelatedDrug[]
  // Legacy fields for backward compatibility
  name?: string // Maps to brandName
  slug?: string // Maps to drugId
  aiGeneratedTitle?: string // Maps to enrichment.title
  aiGeneratedMetaDescription?: string // Maps to enrichment.metaDescription
  aiGeneratedContent?: string // Maps to enrichment.summary
  aiGeneratedFaqs?: any // Maps to enrichment.aiGeneratedFaqs
  originalLabelData?: any // Maps to fdaData
  createdAt: string
  updatedAt: string
}

export interface SearchParams {
  search?: string
  limit?: number
  offset?: number
}

export interface DrugSearchResult {
  id: string
  brandName: string
  genericName?: string
  manufacturer: string
  ndc: string
  source: 'fda' | 'local'
}

export const drugsApi = {
  getAll: async (params?: SearchParams): Promise<Drug[]> => {
    const response = await api.get('/drugs', { params })
    return response.data
  },

  getBySlug: async (slug: string): Promise<Drug> => {
    const response = await api.get(`/drugs/${slug}`)
    return response.data
  },

  create: async (drugData: Partial<Drug>): Promise<Drug> => {
    const response = await api.post('/drugs', drugData)
    return response.data
  },

  search: async (query: string, limit?: number): Promise<DrugSearchResult[]> => {
    console.log('API search called with:', { query, limit })
    try {
      const response = await api.get('/drugs/search', {
        params: { q: query, limit },
      })
      console.log('API response:', response.data)
      return response.data
    } catch (error) {
      console.error('API search error:', error)
      throw error
    }
  },

  fetchAndCache: async (ndc: string): Promise<Drug> => {
    console.log('Fetching and caching drug with NDC:', ndc)
    try {
      const response = await api.get(`/drugs/fetch-and-cache/${ndc}`)
      console.log('Fetch and cache response:', response.data)
      return response.data
    } catch (error) {
      console.error('Fetch and cache error:', error)
      throw error
    }
  },
}

// Utility function to safely convert string or array fields to string
export function normalizeDrugField(field: string | string[] | undefined): string | undefined {
  if (!field) return undefined
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return field.join('\n\n')
  return undefined
}
