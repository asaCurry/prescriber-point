import { cn } from '@/lib/utils'

interface TextContentProps {
  content: string | string[]
  className?: string
  variant?: 'default' | 'prose' | 'list'
  maxLines?: number
  showReadMore?: boolean
}

export function TextContent({
  content,
  className,
  variant = 'default',
  maxLines,
  showReadMore = true,
}: TextContentProps) {
  // Handle array content
  if (Array.isArray(content)) {
    return (
      <div className={cn('space-y-3', className)}>
        {content.map((item, index) => (
          <FormattedTextBlock
            key={index}
            text={item}
            maxLines={maxLines}
            showReadMore={showReadMore}
          />
        ))}
      </div>
    )
  }

  // Handle single content
  return (
    <div className={className}>
      <FormattedTextBlock text={content} maxLines={maxLines} showReadMore={showReadMore} />
    </div>
  )
}

interface FormattedTextBlockProps {
  text: string
  maxLines?: number
  showReadMore?: boolean
}

function FormattedTextBlock({ text, maxLines, showReadMore }: FormattedTextBlockProps) {
  // Split long text into paragraphs for better readability
  const formatText = (text: string): string[] => {
    // Remove extra whitespace and split by periods followed by capital letters or numbers
    const cleaned = text.replace(/\s+/g, ' ').trim()

    // Split into sentences but keep reasonable chunks
    const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z]|\d)/)

    // Group sentences into paragraphs (max 3-4 sentences per paragraph)
    const paragraphs: string[] = []
    let currentParagraph = ''

    sentences.forEach((sentence, index) => {
      if (
        currentParagraph.length + sentence.length > 300 ||
        (currentParagraph && index % 3 === 0)
      ) {
        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim())
        }
        currentParagraph = sentence
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + sentence
      }
    })

    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim())
    }

    return paragraphs.length > 0 ? paragraphs : [text]
  }

  const paragraphs = formatText(text)

  // Truncate if maxLines is specified
  const shouldTruncate = maxLines && paragraphs.length > maxLines
  const displayParagraphs = shouldTruncate ? paragraphs.slice(0, maxLines) : paragraphs

  return (
    <div className="space-y-3">
      {displayParagraphs.map((paragraph, index) => (
        <p key={index} className="text-sm leading-relaxed text-foreground">
          {paragraph}
        </p>
      ))}
      {shouldTruncate && showReadMore && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-primary hover:text-primary/80 font-medium list-none">
            <span className="group-open:hidden">Show more...</span>
          </summary>
          <div className="mt-3 space-y-3">
            {paragraphs.slice(maxLines).map((paragraph, index) => (
              <p key={index + maxLines!} className="text-sm leading-relaxed text-foreground">
                {paragraph}
              </p>
            ))}
            <summary className="cursor-pointer text-sm text-primary hover:text-primary/80 font-medium list-none float-right mt-2">
              <span className="group-open:inline">Show less</span>
            </summary>
          </div>
        </details>
      )}
    </div>
  )
}

interface ReadMoreTextProps {
  children: string
  maxLength?: number
  className?: string
}

export function ReadMoreText({ children, maxLength = 200, className }: ReadMoreTextProps) {
  const text = children.trim()
  const shouldTruncate = text.length > maxLength

  if (!shouldTruncate) {
    return <p className={cn('text-sm leading-relaxed', className)}>{text}</p>
  }

  const truncatedText = text.slice(0, maxLength).trim()
  const remainingText = text.slice(maxLength).trim()

  return (
    <div className={className}>
      <details className="group">
        <p className="text-sm leading-relaxed">
          {truncatedText}
          <summary className="cursor-pointer text-primary hover:text-primary/80 font-medium list-none ml-1 inline">
            <span className="group-open:hidden">...more</span>
          </summary>
        </p>
        <div className="group-open:block hidden">
          <p className="text-sm leading-relaxed">{remainingText}</p>
          <summary className="cursor-pointer text-primary hover:text-primary/80 font-medium list-none float-right mt-2">
            <span className="group-open:inline">less</span>
          </summary>
        </div>
      </details>
    </div>
  )
}

interface HighlightBoxProps {
  title: string
  children: React.ReactNode
  variant?: 'info' | 'warning' | 'success' | 'danger'
  icon?: React.ReactNode
  className?: string
}

export function HighlightBox({
  title,
  children,
  variant = 'info',
  icon,
  className,
}: HighlightBoxProps) {
  const variants = {
    info: 'border-blue-200 bg-blue-50/50 text-blue-900',
    warning: 'border-yellow-200 bg-yellow-50/50 text-yellow-900',
    success: 'border-green-200 bg-green-50/50 text-green-900',
    danger: 'border-red-200 bg-red-50/50 text-red-900',
  }

  const iconVariants = {
    info: '💡',
    warning: '⚠️',
    success: '✅',
    danger: '🚨',
  }

  return (
    <div className={cn('border-l-4 rounded-r-lg p-4 my-4', variants[variant], className)}>
      <div className="flex items-start gap-3">
        {icon || (
          <span className="text-lg" aria-hidden="true">
            {iconVariants[variant]}
          </span>
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-2">{title}</h4>
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}
