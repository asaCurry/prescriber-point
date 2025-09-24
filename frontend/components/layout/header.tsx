'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        'border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50',
        className
      )}
    >
      <div className="container mx-auto px-6 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-primary-foreground"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PrescriberPoint</h1>
              <p className="text-xs text-muted-foreground">Drug Information Platform</p>
            </div>
          </Link>

          {/* Navigation & Info */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex text-xs">
              FDA Enhanced
            </Badge>
            <Badge variant="secondary" className="hidden sm:flex text-xs">
              AI Powered
            </Badge>

            {/* Search hint for larger screens */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Search drugs by name or NDC</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
