'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { cn } from '@/lib/utils'
import { Drug, normalizeDrugField } from '@/lib/api'

interface QuickAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'secondary' | 'outline'
}

interface DrugPageHeaderProps {
  drug: Drug
  className?: string
}

export function DrugPageHeader({ drug, className }: DrugPageHeaderProps) {
  const drugName = drug.brandName || drug.genericName || drug.name || 'Unknown Drug'

  const breadcrumbItems = [
    {
      label: 'PrescriberPoint',
      href: '/',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: drugName,
      current: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
    },
  ]

  return (
    <header className={cn('space-y-6', className)}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Main Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 space-y-4">
          {/* Title and Status */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-moderate">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-foreground gradient-text-medical">
                {drugName}
              </h1>
              {drug.genericName && drug.brandName && drug.genericName !== drug.brandName && (
                <p className="text-xl text-muted-foreground font-medium">
                  Generic: {drug.genericName}
                </p>
              )}
            </div>
          </div>

          {/* Key Information Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="code-blue" size="lg">
              NDC: {drug.ndc}
            </Badge>
            {drug.manufacturer && (
              <Badge variant="blue-light" size="default">
                {drug.manufacturer}
              </Badge>
            )}
          </div>

          {/* Enhanced Last Updated Information */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {drug.updatedAt && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Last updated:{' '}
                  {new Date(drug.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <Badge variant="blue-light" size="sm">
                  {(() => {
                    const daysSince = Math.floor(
                      (Date.now() - new Date(drug.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
                    )
                    if (daysSince === 0) return 'Today'
                    if (daysSince === 1) return '1 day ago'
                    if (daysSince < 30) return `${daysSince} days ago`
                    if (daysSince < 365) return `${Math.floor(daysSince / 30)} months ago`
                    return `${Math.floor(daysSince / 365)} years ago`
                  })()}
                </Badge>
              </div>
            )}

            {drug.createdAt && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>
                  Added:{' '}
                  {new Date(drug.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            {drug.dataSource && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Source: {drug.dataSource}</span>
                <Badge variant="green-light" size="sm">
                  Verified
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
