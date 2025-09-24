import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const currentItem = items[items.length - 1]
  const parentItem = items[items.length - 2]

  return (
    <nav
      className={cn('flex flex-col sm:flex-row sm:items-center gap-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {/* Desktop Full Breadcrumbs */}
      <div className="hidden sm:flex items-center space-x-2 bg-muted/30 rounded-full px-3 py-2 backdrop-blur-sm">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <svg
                className="w-3 h-3 text-muted-foreground/50 mx-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200',
                  'text-muted-foreground hover:text-foreground hover:bg-background/80',
                  'font-medium hover:shadow-sm'
                )}
              >
                {item.icon && <span className="opacity-70">{item.icon}</span>}
                <span className="truncate max-w-[120px]">{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md',
                  item.current
                    ? 'text-foreground font-semibold bg-background/90 shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {item.icon && (
                  <span className={cn(item.current ? 'text-primary' : 'opacity-70')}>
                    {item.icon}
                  </span>
                )}
                <span className="truncate max-w-[120px]">{item.label}</span>
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile Simplified Breadcrumbs */}
      <div className="flex sm:hidden items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 backdrop-blur-sm">
        {parentItem && (
          <Link
            href={parentItem.href || '/'}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back to {parentItem.label}</span>
          </Link>
        )}
        {!parentItem && (
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="font-medium">Back to Home</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
