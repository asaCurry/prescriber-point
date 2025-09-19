import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { drugsApi, type DrugSearchResult } from '@/lib/api'

export function useDebouncedSearch(initialQuery: string = '', debounceMs: number = 300) {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Only search if query has 3+ characters
  const shouldSearch = debouncedQuery.length >= 3

  const {
    data: results = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drug-search', debouncedQuery],
    queryFn: () => drugsApi.search(debouncedQuery, 10),
    enabled: shouldSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [])

  const clearQuery = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
  }, [])

  return {
    query,
    debouncedQuery,
    results,
    isLoading: isLoading && shouldSearch,
    error,
    updateQuery,
    clearQuery,
    refetch,
    hasQuery: query.length > 0,
    isSearchable: shouldSearch,
  }
}
