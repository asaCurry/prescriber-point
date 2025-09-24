'use client'

import { useEffect } from 'react'
import { useRecentPages } from '@/hooks/use-recent-pages'
import { Drug } from '@/lib/api'

interface RecentPageTrackerProps {
  drug: Drug
  slug: string
}

export function RecentPageTracker({ drug, slug }: RecentPageTrackerProps) {
  const { addPage } = useRecentPages()

  useEffect(() => {
    // Only run on client side and when we have valid data
    if (typeof window === 'undefined' || !drug || !slug) {
      return
    }

    // Add this page to recent history when component mounts
    addPage({
      slug: slug,
      name: drug.brandName || drug.name || 'Unknown Drug',
      genericName: drug.genericName,
      manufacturer: drug.manufacturer,
      ndc: drug.ndc,
    })
  }, [drug, slug, addPage])

  // This component doesn't render anything - it just tracks the page visit
  return null
}
