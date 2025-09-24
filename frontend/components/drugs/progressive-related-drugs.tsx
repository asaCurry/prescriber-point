'use client'

import { useEffect, useState } from 'react'
import { RelatedDrugs } from './related-drugs'
import { RelatedDrug } from '@/lib/api'

interface ProgressiveRelatedDrugsProps {
  drugId: number
  initialRelatedDrugs?: RelatedDrug[]
}

export function ProgressiveRelatedDrugs({
  drugId,
  initialRelatedDrugs = [],
}: ProgressiveRelatedDrugsProps) {
  const [relatedDrugs, setRelatedDrugs] = useState<RelatedDrug[]>(initialRelatedDrugs)
  const [isLoading, setIsLoading] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // If we already have related drugs, don't check again
    if (initialRelatedDrugs.length > 0) {
      setHasChecked(true)
      return
    }

    // Check for related drugs after a short delay
    const checkForRelatedDrugs = async () => {
      if (hasChecked) return

      setIsLoading(true)
      setHasChecked(true)

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/drugs/${drugId}/related`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setRelatedDrugs(data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch related drugs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Check after 2 seconds to allow enrichment to complete
    const timeoutId = setTimeout(checkForRelatedDrugs, 2000)

    return () => clearTimeout(timeoutId)
  }, [drugId, initialRelatedDrugs.length, hasChecked])

  // Show loading state only if we're actively loading and have no initial data
  if (isLoading && relatedDrugs.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Related Drugs</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Finding related medications...</span>
        </div>
      </div>
    )
  }

  return <RelatedDrugs relatedDrugs={relatedDrugs} />
}
