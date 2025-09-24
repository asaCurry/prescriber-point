'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'

interface PillData {
  label: string
  variant: 'sub-blue' | 'sub-orange' | 'sub-green' | 'sub-purple' | 'sub-teal'
}

interface ProgressData {
  current: number
  total: number
  label?: string
}

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  icon?: React.ReactNode
  badge?: string | number
  pills?: PillData[]
  progress?: ProgressData
  priority?: 'high' | 'medium' | 'low'
  category?: 'safety' | 'dosage' | 'indication' | 'contraindication' | 'interaction'
  showBadge?: boolean
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
  icon,
  badge,
  pills,
  progress,
  priority,
  category,
  showBadge = false,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`

  // Get category-specific styling
  const getCategoryIcon = () => {
    if (icon) return icon

    switch (category) {
      case 'safety':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )
      case 'dosage':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        )
      case 'indication':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'contraindication':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'interaction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
    }
  }

  const getCategoryColors = () => {
    switch (category) {
      case 'safety':
        return 'hover:bg-red-50/50 border-l-red-500'
      case 'dosage':
        return 'hover:bg-blue-50/50 border-l-blue-500'
      case 'indication':
        return 'hover:bg-green-50/50 border-l-green-500'
      case 'contraindication':
        return 'hover:bg-red-50/50 border-l-red-600'
      case 'interaction':
        return 'hover:bg-purple-50/50 border-l-purple-500'
      default:
        return 'hover:bg-muted/30 border-l-primary'
    }
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return Math.min((progress.current / progress.total) * 100, 100)
  }

  return (
    <div
      className={cn(
        'border rounded-xl shadow-soft hover:shadow-moderate transition-all duration-200 hover-lift border-l-4',
        getCategoryColors(),
        priority === 'high' && 'ring-2 ring-red-200 ring-opacity-50',
        className
      )}
    >
      <button
        className={cn(
          'w-full px-6 py-4 text-left flex items-center justify-between transition-colors rounded-xl',
          category &&
            `hover:bg-${category === 'safety' ? 'red' : category === 'dosage' ? 'blue' : category === 'indication' ? 'green' : category === 'contraindication' ? 'red' : 'purple'}-50/30`
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-describedby={badge ? `${contentId}-badge` : undefined}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Enhanced Icon with Gradient Background */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm',
              category === 'safety' && 'safety-gradient',
              category === 'dosage' && 'dosage-gradient',
              category === 'indication' && 'indication-gradient',
              category === 'contraindication' && 'contraindication-gradient',
              category === 'interaction' && 'interaction-gradient',
              !category && 'bg-primary'
            )}
          >
            {getCategoryIcon()}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground text-lg">{title}</span>
              {priority && (
                <Badge variant={`priority-${priority}`} size="sm" className="text-[10px]">
                  {priority.toUpperCase()}
                </Badge>
              )}
              {badge && showBadge && (
                <span
                  id={`${contentId}-badge`}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full font-medium min-w-[24px] text-center',
                    category === 'safety' && 'bg-red-100 text-red-800',
                    category === 'dosage' && 'bg-blue-100 text-blue-800',
                    category === 'indication' && 'bg-green-100 text-green-800',
                    category === 'contraindication' && 'bg-red-100 text-red-800',
                    category === 'interaction' && 'bg-purple-100 text-purple-800',
                    !category && 'bg-primary/10 text-primary'
                  )}
                  aria-label={`${badge} items`}
                >
                  {badge}
                </span>
              )}
            </div>

            {/* Progress Indicator */}
            {progress && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      category === 'safety' && 'safety-gradient',
                      category === 'dosage' && 'dosage-gradient',
                      category === 'indication' && 'indication-gradient',
                      category === 'contraindication' && 'contraindication-gradient',
                      category === 'interaction' && 'interaction-gradient',
                      !category && 'bg-primary'
                    )}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {progress.current}/{progress.total}
                  {progress.label && ` ${progress.label}`}
                </span>
              </div>
            )}
          </div>

          {pills && pills.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              {pills.map((pill, index) => (
                <Badge key={index} variant={pill.variant} className="text-[10px] px-2 py-0.5">
                  {pill.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <span
          className="text-muted-foreground transition-transform duration-200"
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div
          id={contentId}
          className="px-6 pb-6 border-t bg-muted/10 rounded-b-xl"
          role="region"
          aria-labelledby={`${contentId}-button`}
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

interface AccordionGroupProps {
  children: React.ReactNode
  className?: string
}

export function AccordionGroup({ children, className }: AccordionGroupProps) {
  return (
    <div
      className={cn('space-y-4', className)}
      role="region"
      aria-label="Drug information sections"
    >
      {children}
    </div>
  )
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-l-green-500 hover:bg-green-50/30'
      case 'warning':
        return 'border-l-yellow-500 hover:bg-yellow-50/30'
      case 'danger':
        return 'border-l-red-500 hover:bg-red-50/30'
      default:
        return 'border-l-gray-300 hover:bg-gray-50/30'
    }
  }

  const getVariantIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )
      case 'danger':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
    }
  }

  return (
    <div
      className={cn(
        'border rounded-lg shadow-sm border-l-4 transition-all duration-200',
        getVariantStyles(),
        className
      )}
    >
      <button
        className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center text-white',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'danger' && 'bg-red-500',
              variant === 'default' && 'bg-gray-500'
            )}
          >
            {getVariantIcon()}
          </div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <span
          className="text-muted-foreground transition-transform duration-200"
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div
          id={contentId}
          className="px-4 pb-4 border-t bg-muted/5 rounded-b-lg"
          role="region"
          aria-labelledby={`${contentId}-button`}
        >
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  )
}
