import { cn } from '@/lib/utils'

interface PillProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Pill({ children, variant = 'default', size = 'md', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        {
          // Variants
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'border border-input bg-background text-foreground': variant === 'outline',
          'bg-destructive text-destructive-foreground': variant === 'destructive',

          // Sizes
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
          'px-4 py-1.5 text-base': size === 'lg',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
