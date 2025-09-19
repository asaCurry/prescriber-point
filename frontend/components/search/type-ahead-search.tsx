'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDebouncedSearch } from '@/hooks/use-debounced-search'
import { DrugSearchResult } from '@/lib/api'
import Link from 'next/link'

interface TypeAheadSearchProps {
  placeholder?: string
  onResultSelect?: (result: DrugSearchResult) => void
  className?: string
}

function generateDrugSlug(brandName: string, ndc: string): string {
  const cleanName = brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  const cleanNDC = ndc.replace(/[^0-9-]/g, '')
  return `${cleanName}-${cleanNDC}`
}

export function TypeAheadSearch({
  placeholder = 'Search drugs by name or NDC...',
  onResultSelect,
  className = '',
}: TypeAheadSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { query, results, isLoading, error, updateQuery, clearQuery, hasQuery, isSearchable } =
    useDebouncedSearch()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show dropdown when we have searchable query or results
  useEffect(() => {
    setIsOpen((isSearchable && query.length >= 3) || results.length > 0)
  }, [isSearchable, query.length, results.length])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleResultSelect = (result: DrugSearchResult) => {
    setIsOpen(false)
    setSelectedIndex(-1)
    onResultSelect?.(result)
  }

  const handleClear = () => {
    clearQuery()
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          autoComplete="off"
        />
        {hasQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto shadow-lg">
          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="p-4 text-center text-sm text-destructive">
                Unable to search at the moment. Please try again.
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && isSearchable && results.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No drugs found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Search Instruction */}
            {query.length > 0 && query.length < 3 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Type at least 3 characters to search
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => {
                  const slug = generateDrugSlug(result.brandName, result.ndc)
                  const isSelected = index === selectedIndex

                  return (
                    <div
                      key={`${result.source}-${result.id}`}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{result.brandName}</h4>
                            <Badge
                              variant={result.source === 'local' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {result.source === 'local' ? 'In Database' : 'FDA'}
                            </Badge>
                          </div>
                          {result.genericName && (
                            <p className="text-xs text-muted-foreground mb-1">
                              Generic: {result.genericName}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{result.manufacturer}</span>
                            <span className="font-mono">NDC: {result.ndc}</span>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {result.source === 'local' ? (
                            <Link
                              href={`/drugs/${slug}`}
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          ) : (
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
