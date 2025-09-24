'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDebouncedSearch } from '@/hooks/use-debounced-search'
import { DrugSearchResult } from '@/lib/api'
import { DrugSearchResultItem } from './drug-search-result'

interface TypeAheadSearchProps {
  placeholder?: string
  onResultSelect?: (result: DrugSearchResult) => void
  className?: string
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
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-auto shadow-xl border border-border/50 backdrop-blur-sm bg-background/95">
          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Searching FDA database...
                  </span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="p-6 text-center">
                <div className="text-sm text-destructive font-medium mb-1">
                  Search temporarily unavailable
                </div>
                <div className="text-xs text-muted-foreground">Please try again in a moment</div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && isSearchable && results.length === 0 && (
              <div className="p-6 text-center">
                <div className="text-sm text-muted-foreground font-medium mb-1">No drugs found</div>
                <div className="text-xs text-muted-foreground">
                  Try searching for &ldquo;{query}&rdquo; with different terms
                </div>
              </div>
            )}

            {/* Search Instruction */}
            {query.length > 0 && query.length < 3 && (
              <div className="p-6 text-center">
                <div className="text-sm text-muted-foreground font-medium mb-1">Keep typing...</div>
                <div className="text-xs text-muted-foreground">
                  Enter at least 3 characters to search
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border/30">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </div>
                </div>
                <div className="py-1">
                  {results.map((result, index) => (
                    <div
                      key={`${result.source}-${result.id}`}
                      className="animate-in fade-in-0 slide-in-from-top-1 duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <DrugSearchResultItem
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleResultSelect(result)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
