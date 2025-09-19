import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Drug {
  id: string
  name: string
  slug: string
  ndc: string // Added NDC field
  genericName?: string
  manufacturer: string
  indications?: string[]
  contraindications?: string[]
  dosing?: string
  warnings?: string[]
  description?: string
  aiGeneratedTitle?: string
  aiGeneratedMetaDescription?: string
  aiGeneratedContent?: string
  aiGeneratedFaqs?: any
  relatedDrugs?: string[]
  originalLabelData?: any
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
    const response = await api.get('/drugs/search', {
      params: { q: query, limit },
    })
    return response.data
  },
}
