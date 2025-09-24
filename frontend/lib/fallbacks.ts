/**
 * Enhanced fallback utilities for graceful data handling
 */

export interface FallbackOptions {
  /** Show helpful placeholder text instead of hiding the section */
  showPlaceholder?: boolean
  /** Custom placeholder text */
  placeholder?: string
  /** Show "coming soon" instead of "not available" */
  comingSoon?: boolean
  /** Minimum items required to show a section */
  minItems?: number
}

/**
 * Enhanced text fallback with contextual placeholders
 */
export function textFallback(
  value: string | null | undefined,
  options: FallbackOptions & {
    context?: 'drug' | 'indication' | 'warning' | 'dosage' | 'manufacturer'
  } = {}
): string {
  const { context = 'drug', placeholder, comingSoon = false } = options

  if (value && value.trim()) {
    return value.trim()
  }

  if (placeholder) {
    return placeholder
  }

  if (comingSoon) {
    const comingSoonMessages = {
      drug: 'Additional information will be available soon',
      indication: 'Indication details will be added soon',
      warning: 'Safety information will be updated soon',
      dosage: 'Dosing guidelines will be available soon',
      manufacturer: 'Manufacturer information pending',
    }
    return comingSoonMessages[context]
  }

  const fallbackMessages = {
    drug: 'Information not currently available',
    indication: 'No specific indications listed',
    warning: 'No warnings currently documented',
    dosage: 'Dosing information not specified',
    manufacturer: 'Manufacturer not specified',
  }

  return fallbackMessages[context]
}

/**
 * Enhanced array fallback with contextual placeholders
 */
export function arrayFallback<T>(
  value: T[] | null | undefined,
  options: FallbackOptions & { context?: 'indications' | 'warnings' | 'routes' | 'faqs' } = {}
): T[] | string {
  const {
    showPlaceholder = true,
    placeholder,
    context = 'indications',
    minItems = 1,
    comingSoon = false,
  } = options

  if (value && Array.isArray(value) && value.length >= minItems) {
    return value
  }

  if (!showPlaceholder) {
    return []
  }

  if (placeholder) {
    return placeholder
  }

  if (comingSoon) {
    const comingSoonMessages = {
      indications: 'Additional indications will be listed soon',
      warnings: 'Safety warnings will be updated soon',
      routes: 'Administration routes will be specified soon',
      faqs: 'Frequently asked questions will be available soon',
    }
    return comingSoonMessages[context]
  }

  const fallbackMessages = {
    indications: 'No indications currently documented',
    warnings: 'No warnings currently documented',
    routes: 'Administration routes not specified',
    faqs: 'No frequently asked questions available',
  }

  return fallbackMessages[context]
}

/**
 * Smart drug name fallback with multiple options
 */
export function drugNameFallback(
  brandName?: string | null,
  genericName?: string | null,
  name?: string | null,
  fallback: string = 'Unknown Drug'
): string {
  return brandName?.trim() || name?.trim() || genericName?.trim() || fallback
}

/**
 * Smart manufacturer fallback
 */
export function manufacturerFallback(
  manufacturer?: string | null,
  fdaData?: any,
  fallback: string = 'Manufacturer not specified'
): string {
  if (manufacturer?.trim()) {
    return manufacturer.trim()
  }

  // Try to extract from FDA data
  if (fdaData?.manufacturer_name?.[0]) {
    return fdaData.manufacturer_name[0]
  }

  if (fdaData?.openfda?.manufacturer_name?.[0]) {
    return fdaData.openfda.manufacturer_name[0]
  }

  return fallback
}

/**
 * Confidence score display with fallback
 */
export function confidenceFallback(
  score?: number | null,
  showPlaceholder: boolean = true
): { display: string; variant: 'default' | 'secondary' | 'outline' } | null {
  if (typeof score === 'number' && score >= 0 && score <= 1) {
    const percentage = (score * 100).toFixed(0)
    return {
      display: `${percentage}% confidence`,
      variant: score > 0.8 ? 'default' : score > 0.6 ? 'secondary' : 'outline',
    }
  }

  if (showPlaceholder) {
    return {
      display: 'Confidence pending',
      variant: 'outline' as const,
    }
  }

  return null
}

/**
 * NDC fallback with validation
 */
export function ndcFallback(
  ndc?: string | null,
  placeholder: string = 'NDC not available'
): string {
  if (ndc?.trim() && /^\d{4,5}-\d{3,4}-?\d{0,2}$/.test(ndc.trim())) {
    return ndc.trim()
  }
  return placeholder
}

/**
 * Date fallback with formatting
 */
export function dateFallback(
  date?: string | Date | null,
  format: 'short' | 'long' = 'short',
  placeholder: string = 'Date not available'
): string {
  if (!date) return placeholder

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return placeholder

    if (format === 'long') {
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    return dateObj.toLocaleDateString()
  } catch {
    return placeholder
  }
}

/**
 * Section visibility helper
 */
export function shouldShowSection(
  data: any,
  options: { requireMinItems?: number; requireNonEmpty?: boolean } = {}
): boolean {
  const { requireMinItems = 1, requireNonEmpty = true } = options

  if (!data) return false

  if (Array.isArray(data)) {
    return data.length >= requireMinItems
  }

  if (typeof data === 'string') {
    return requireNonEmpty ? data.trim().length > 0 : true
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    return keys.length >= requireMinItems
  }

  return Boolean(data)
}

/**
 * Enhanced loading skeleton dimensions that match content
 */
export const skeletonSizes = {
  title: { width: '60%', height: '2rem' },
  subtitle: { width: '40%', height: '1.5rem' },
  text: { width: '80%', height: '1rem' },
  badge: { width: '6rem', height: '1.5rem' },
  card: { width: '100%', height: '12rem' },
  accordion: { width: '100%', height: '3rem' },
  infoCard: { width: '100%', height: '8rem' },
  pill: { width: '4rem', height: '1.5rem' },
}
