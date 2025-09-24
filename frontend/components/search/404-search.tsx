'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { drugsApi } from '@/lib/api'

interface Search404Props {
  placeholder?: string
  className?: string
}

export function Search404({
  placeholder = 'Search for a drug name...',
  className = '',
}: Search404Props) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    try {
      // Search for drugs
      const results = await drugsApi.search(query.trim(), 5)

      if (results.length > 0) {
        // Navigate to the first result
        const firstResult = results[0]
        // Assuming the API returns a slug or we need to construct it
        const slug = `${firstResult.brandName.toLowerCase().replace(/\s+/g, '-')}-${firstResult.ndc.replace(/-/g, '')}`
        router.push(`/drugs/${slug}`)
      } else {
        // If no results, redirect to search page with query
        router.push(`/search?q=${encodeURIComponent(query)}`)
      }
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to search page
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSearch} className={`flex gap-2 ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !query.trim()}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Search className="w-4 h-4 mr-2" />
        )}
        Search
      </Button>
    </form>
  )
}

// Quick search suggestions component
export function QuickSearchSuggestions() {
  const suggestions = [
    { name: 'Lipitor', description: 'Atorvastatin calcium' },
    { name: 'Metformin', description: 'Diabetes medication' },
    { name: 'Lisinopril', description: 'ACE inhibitor' },
    { name: 'Amoxicillin', description: 'Antibiotic' },
  ]

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-2">Popular searches:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.name}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            onClick={() => {
              // This would trigger a search for the suggestion
              console.log('Search for:', suggestion.name)
            }}
          >
            {suggestion.name}
          </button>
        ))}
      </div>
    </div>
  )
}
