'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getRecentPages,
  addRecentPage,
  removeRecentPage,
  clearRecentPages,
  type RecentPage,
} from '@/lib/recent-pages'

export function useRecentPages() {
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load recent pages from cookies on mount
  useEffect(() => {
    const loadRecentPages = () => {
      try {
        const pages = getRecentPages()
        setRecentPages(pages)
      } catch (error) {
        console.warn('Failed to load recent pages:', error)
        setRecentPages([])
      } finally {
        setIsLoading(false)
      }
    }

    // Use a small delay to ensure cookies are available
    const timer = setTimeout(loadRecentPages, 100)
    return () => clearTimeout(timer)
  }, [])

  // Add a page to recent history
  const addPage = useCallback((page: Omit<RecentPage, 'visitedAt'>) => {
    addRecentPage(page)
    // Update state immediately for better UX
    setRecentPages(getRecentPages())
  }, [])

  // Remove a page from recent history
  const removePage = useCallback((slug: string) => {
    removeRecentPage(slug)
    setRecentPages(getRecentPages())
  }, [])

  // Clear all recent pages
  const clearAll = useCallback(() => {
    clearRecentPages()
    setRecentPages([])
  }, [])

  // Refresh recent pages from cookies
  const refresh = useCallback(() => {
    setRecentPages(getRecentPages())
  }, [])

  return {
    recentPages,
    isLoading,
    addPage,
    removePage,
    clearAll,
    refresh,
    hasRecentPages: recentPages.length > 0,
  }
}
