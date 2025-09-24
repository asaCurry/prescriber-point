'use client'

import { Clock, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRecentPages } from '@/hooks/use-recent-pages'
import { formatDistanceToNow } from 'date-fns'

interface RecentlyViewedProps {
  className?: string
  maxItems?: number
  showClearAll?: boolean
}

export function RecentlyViewed({
  className = '',
  maxItems = 6,
  showClearAll = true,
}: RecentlyViewedProps) {
  const { recentPages, isLoading, removePage, clearAll, hasRecentPages } = useRecentPages()

  const displayedPages = recentPages.slice(0, maxItems)

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Recently Viewed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasRecentPages) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Recently Viewed</CardTitle>
            </div>
            <CardDescription>Drug pages you view will appear here for quick access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No recently viewed drugs yet</p>
              <p className="text-xs mt-1">Start searching to see your history here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Recently Viewed</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {recentPages.length}
              </Badge>
            </div>
            {showClearAll && hasRecentPages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground hover:text-destructive h-8 px-2"
                title="Clear all recent pages"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>
            Quick access to drug information you&apos;ve recently viewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayedPages.map((page) => (
              <div
                key={page.slug}
                className="group flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Link href={`/drugs/${page.slug}`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate">
                        {page.name}
                      </h4>
                      {page.genericName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Generic: {page.genericName}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="truncate">{page.manufacturer}</span>
                        <span className="font-mono flex-shrink-0">NDC: {page.ndc}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(page.visitedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    removePage(page.slug)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive ml-2 flex-shrink-0"
                  title="Remove from recent pages"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {recentPages.length > maxItems && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  {recentPages.length - maxItems} more recent page
                  {recentPages.length - maxItems === 1 ? '' : 's'} not shown
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
