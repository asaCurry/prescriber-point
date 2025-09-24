'use client'

import { ExternalLink, Building2, Hash } from 'lucide-react'
import { Pill } from '@/components/ui/pill'
import { DrugSearchResult } from '@/lib/api'
import Link from 'next/link'

interface DrugSearchResultProps {
  result: DrugSearchResult
  isSelected?: boolean
  onClick?: () => void
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

export function DrugSearchResultItem({
  result,
  isSelected = false,
  onClick,
}: DrugSearchResultProps) {
  const slug = generateDrugSlug(result.brandName, result.ndc)

  return (
    <div
      className={`
        px-4 py-4 cursor-pointer transition-all duration-200 border-b border-border/30 last:border-b-0
        ${isSelected ? 'bg-accent border-l-4 border-l-primary' : 'hover:bg-accent/30'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Brand Name and Source */}
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-semibold text-base text-foreground truncate">{result.brandName}</h4>
            <Pill
              variant={result.source === 'local' ? 'default' : 'secondary'}
              size="sm"
              className="flex-shrink-0"
            >
              {result.source === 'local' ? 'Local' : 'FDA'}
            </Pill>
          </div>

          {/* Generic Name */}
          {result.genericName && (
            <div className="mb-3">
              <Pill variant="outline" size="sm" className="bg-muted/50">
                Generic: {result.genericName}
              </Pill>
            </div>
          )}

          {/* Metadata Pills */}
          <div className="flex flex-wrap gap-2">
            <Pill
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 bg-background/50"
            >
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[140px] text-xs">{result.manufacturer}</span>
            </Pill>

            <Pill
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 bg-background/50"
            >
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-xs">{result.ndc}</span>
            </Pill>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0 pt-1">
          {result.source === 'local' ? (
            <Link
              href={`/drugs/${slug}`}
              className="text-primary hover:text-primary/80 transition-colors p-1 rounded-md hover:bg-primary/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : (
            <div className="p-1 rounded-md">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
