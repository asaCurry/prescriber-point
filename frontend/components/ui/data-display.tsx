import { Badge } from './badge'
import { cn } from '@/lib/utils'
import { textFallback, shouldShowSection } from '@/lib/fallbacks'

interface DataGridProps {
  data: Array<{ label: string; value: string | string[] | null | undefined }>
  className?: string
  showFallbacks?: boolean
  fallbackText?: string
}

export function DataGrid({
  data,
  className,
  showFallbacks = true,
  fallbackText = 'Not available',
}: DataGridProps) {
  // Function to determine badge variant based on label
  const getBadgeVariant = (label: string) => {
    const codeLabels = ['NDC', 'Drug ID', 'UNII', 'RxCUI', 'SPL ID', 'FDA']
    if (codeLabels.includes(label)) {
      return label === 'NDC' || label === 'Drug ID' ? 'code-blue' : 'code-indigo'
    }
    return 'blue-light'
  }

  // Filter data to only show items with values, or include fallbacks
  const filteredData = data.filter((item) => {
    if (!item.value) return showFallbacks
    if (Array.isArray(item.value)) return item.value.length > 0 || showFallbacks
    if (typeof item.value === 'string') return item.value.trim().length > 0 || showFallbacks
    return true
  })

  return (
    <dl className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {filteredData.map((item, index) => {
        const hasValue =
          item.value &&
          (Array.isArray(item.value)
            ? item.value.length > 0
            : typeof item.value === 'string'
              ? item.value.trim().length > 0
              : true)

        return (
          <div key={index} className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-sm text-foreground">
              {hasValue ? (
                Array.isArray(item.value) ? (
                  <div className="flex flex-wrap gap-1">
                    {item.value.map((val, i) => (
                      <Badge key={i} variant={getBadgeVariant(item.label)} className="text-xs">
                        {val}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant={getBadgeVariant(item.label)} className="text-xs">
                    {item.value}
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {fallbackText}
                </Badge>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

interface InfoCardProps {
  title: string
  children: React.ReactNode
  variant?: 'default' | 'warning' | 'danger' | 'success'
  className?: string
  headingLevel?: 'h3' | 'h4' | 'h5' | 'h6'
}

export function InfoCard({
  title,
  children,
  variant = 'default',
  className,
  headingLevel = 'h3',
}: InfoCardProps) {
  const variants = {
    default: 'border-border bg-card',
    warning: 'border-yellow-200 bg-yellow-50/80 shadow-yellow-100',
    danger: 'border-red-200 bg-red-50/80 shadow-red-100',
    success: 'border-green-200 bg-green-50/80 shadow-green-100',
  }

  const titleVariants = {
    default: 'text-foreground',
    warning: 'text-yellow-800',
    danger: 'text-red-800',
    success: 'text-green-800',
  }

  const HeadingTag = headingLevel

  return (
    <div
      className={cn(
        'border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200',
        variants[variant],
        className
      )}
    >
      <HeadingTag className={cn('font-semibold mb-4 text-base', titleVariants[variant])}>
        {title}
      </HeadingTag>
      <div className="text-sm space-y-3">{children}</div>
    </div>
  )
}

interface PillListProps {
  items: string[] | null | undefined
  variant?: 'default' | 'secondary' | 'outline' | 'colorful'
  className?: string
  showFallback?: boolean
  fallbackText?: string
  fallbackVariant?: 'outline' | 'secondary'
}

export function PillList({
  items,
  variant = 'default',
  className,
  showFallback = true,
  fallbackText = 'None specified',
  fallbackVariant = 'outline',
}: PillListProps) {
  // Color rotation for colorful variant
  const colorVariants = [
    'blue-light',
    'green-light',
    'orange-light',
    'indigo-light',
    'emerald-light',
    'amber-light',
  ] as const

  // Handle empty or null items
  if (!items || items.length === 0) {
    if (!showFallback) return null

    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <Badge variant={fallbackVariant} className="text-xs text-muted-foreground">
          {fallbackText}
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item, index) => (
        <Badge
          key={index}
          variant={variant === 'colorful' ? colorVariants[index % colorVariants.length] : variant}
          className="text-xs"
        >
          {item}
        </Badge>
      ))}
    </div>
  )
}
