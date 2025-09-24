import Cookies from 'js-cookie'

export interface RecentPage {
  slug: string
  name: string
  genericName?: string
  manufacturer: string
  ndc: string
  visitedAt: string
}

const COOKIE_NAME = 'recent-drug-pages'
const MAX_RECENT_PAGES = 8
const COOKIE_EXPIRES_DAYS = 30

/**
 * Get recently viewed drug pages from cookies
 */
export function getRecentPages(): RecentPage[] {
  // Return empty array during SSR
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const cookieValue = Cookies.get(COOKIE_NAME)
    if (!cookieValue) return []

    const pages = JSON.parse(cookieValue) as RecentPage[]

    // Filter out any malformed entries and sort by most recent
    return pages
      .filter((page) => page.slug && page.name && page.ndc && page.visitedAt)
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
      .slice(0, MAX_RECENT_PAGES)
  } catch (error) {
    console.warn('Failed to parse recent pages cookie:', error)
    return []
  }
}

/**
 * Add a drug page to the recently viewed list
 */
export function addRecentPage(page: Omit<RecentPage, 'visitedAt'>): void {
  // Skip during SSR
  if (typeof window === 'undefined') {
    return
  }

  try {
    const currentPages = getRecentPages()

    // Remove any existing entry for this drug (by slug)
    const filteredPages = currentPages.filter((p) => p.slug !== page.slug)

    // Add new entry at the beginning
    const newPage: RecentPage = {
      ...page,
      visitedAt: new Date().toISOString(),
    }

    const updatedPages = [newPage, ...filteredPages].slice(0, MAX_RECENT_PAGES)

    // Save to cookie
    Cookies.set(COOKIE_NAME, JSON.stringify(updatedPages), {
      expires: COOKIE_EXPIRES_DAYS,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } catch (error) {
    console.warn('Failed to save recent page to cookie:', error)
  }
}

/**
 * Clear all recently viewed pages
 */
export function clearRecentPages(): void {
  // Skip during SSR
  if (typeof window === 'undefined') {
    return
  }

  Cookies.remove(COOKIE_NAME)
}

/**
 * Remove a specific page from recently viewed
 */
export function removeRecentPage(slug: string): void {
  // Skip during SSR
  if (typeof window === 'undefined') {
    return
  }

  try {
    const currentPages = getRecentPages()
    const filteredPages = currentPages.filter((p) => p.slug !== slug)

    if (filteredPages.length === 0) {
      clearRecentPages()
    } else {
      Cookies.set(COOKIE_NAME, JSON.stringify(filteredPages), {
        expires: COOKIE_EXPIRES_DAYS,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
  } catch (error) {
    console.warn('Failed to remove recent page:', error)
  }
}

/**
 * Check if a page is in the recently viewed list
 */
export function isRecentPage(slug: string): boolean {
  const recentPages = getRecentPages()
  return recentPages.some((page) => page.slug === slug)
}
