import { useQuery } from '@tanstack/react-query'
import { drugsApi, type Drug, type SearchParams } from '@/lib/api'

export function useDrugs(params?: SearchParams) {
  return useQuery({
    queryKey: ['drugs', params],
    queryFn: () => drugsApi.getAll(params),
    enabled: true,
  })
}

export function useDrug(slug: string) {
  return useQuery({
    queryKey: ['drug', slug],
    queryFn: () => drugsApi.getBySlug(slug),
    enabled: !!slug,
  })
}
