import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border hover:bg-accent',

        // Medical Category Gradients
        safety: 'border-transparent safety-gradient text-white hover:scale-105 shadow-sm',
        warning: 'border-transparent warning-gradient text-white hover:scale-105 shadow-sm',
        caution: 'border-transparent caution-gradient text-white hover:scale-105 shadow-sm',
        dosage: 'border-transparent dosage-gradient text-white hover:scale-105 shadow-sm',
        indication: 'border-transparent indication-gradient text-white hover:scale-105 shadow-sm',
        contraindication:
          'border-transparent contraindication-gradient text-white hover:scale-105 shadow-sm',
        interaction: 'border-transparent interaction-gradient text-white hover:scale-105 shadow-sm',

        // Status Indicators
        'status-approved': 'border-transparent status-approved hover:scale-105 shadow-sm',
        'status-warning': 'border-transparent status-warning hover:scale-105 shadow-sm',
        'status-critical': 'border-transparent status-critical hover:scale-105 shadow-sm',
        'status-pending': 'border-transparent status-pending hover:scale-105 shadow-sm',

        // Enhanced Light Variants with Better Hierarchy
        'blue-light':
          'border-blue-200/50 bg-blue-50/80 text-blue-800 hover:bg-blue-100 hover:border-blue-300 shadow-soft',
        'orange-light':
          'border-orange-200/50 bg-orange-50/80 text-orange-800 hover:bg-orange-100 hover:border-orange-300 shadow-soft',
        'green-light':
          'border-green-200/50 bg-green-50/80 text-green-800 hover:bg-green-100 hover:border-green-300 shadow-soft',
        'indigo-light':
          'border-indigo-200/50 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 shadow-soft',
        'amber-light':
          'border-amber-200/50 bg-amber-50/80 text-amber-800 hover:bg-amber-100 hover:border-amber-300 shadow-soft',
        'emerald-light':
          'border-emerald-200/50 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 shadow-soft',

        // Enhanced Code/ID Variants
        'code-blue':
          'border-blue-200 bg-blue-50/90 text-blue-900 font-mono hover:bg-blue-100 shadow-soft hover:shadow-moderate',
        'code-indigo':
          'border-indigo-200 bg-indigo-50/90 text-indigo-900 font-mono hover:bg-indigo-100 shadow-soft hover:shadow-moderate',
        'code-gray':
          'border-gray-200 bg-gray-50/90 text-gray-900 font-mono hover:bg-gray-100 shadow-soft hover:shadow-moderate',

        // Enhanced Subheader Indicators
        'sub-blue':
          'border-transparent bg-blue-100/60 text-blue-700 text-[10px] px-2 py-1 font-medium',
        'sub-orange':
          'border-transparent bg-orange-100/60 text-orange-700 text-[10px] px-2 py-1 font-medium',
        'sub-green':
          'border-transparent bg-green-100/60 text-green-700 text-[10px] px-2 py-1 font-medium',
        'sub-purple':
          'border-transparent bg-purple-100/60 text-purple-700 text-[10px] px-2 py-1 font-medium',
        'sub-teal':
          'border-transparent bg-teal-100/60 text-teal-700 text-[10px] px-2 py-1 font-medium',

        // Priority Levels
        'priority-high':
          'border-transparent bg-red-500 text-white hover:bg-red-600 shadow-moderate animate-pulse',
        'priority-medium':
          'border-transparent bg-yellow-500 text-white hover:bg-yellow-600 shadow-soft',
        'priority-low': 'border-transparent bg-blue-500 text-white hover:bg-blue-600 shadow-soft',

        // Interactive Pills
        'pill-interactive':
          'border-transparent bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105 shadow-moderate cursor-pointer',
        'pill-selected':
          'border-transparent bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 shadow-moderate',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
