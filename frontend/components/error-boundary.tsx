'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void; errorId?: string }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props

    // Log error with enhanced context
    const errorContext = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    }

    console.error('🚨 Error caught by boundary:', errorContext)

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Send to error monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }

    this.setState({ errorInfo })
  }

  private reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // In a real application, you would send this to your error monitoring service
      // For now, we'll just log it with enhanced context
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
        level: this.props.level || 'component',
      }

      // TODO: Send to error monitoring service (e.g., Sentry, LogRocket, DataDog)
      console.log('📊 Error report:', errorReport)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({
  error,
  resetError,
  errorId,
}: {
  error?: Error
  resetError: () => void
  errorId?: string
}) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Oops! Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error ID for support */}
          {errorId && (
            <div className="rounded-lg bg-gray-100 p-3">
              <p className="text-sm text-gray-600">
                <strong>Error ID:</strong> <code className="font-mono text-xs">{errorId}</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Please include this ID when contacting support
              </p>
            </div>
          )}

          {/* Development error details */}
          {isDevelopment && error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                <Bug className="h-4 w-4 mr-2" />
                Development Error Details
              </h4>
              <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-40">
                {error.message}
                {error.stack && `\n\nStack Trace:\n${error.stack}`}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetError} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => typeof window !== 'undefined' && (window.location.href = '/')}
              className="flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Help text */}
          <div className="text-center text-sm text-gray-500">
            <p>
              If this problem persists, please{' '}
              <a
                href="mailto:support@prescriberpoint.com"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                contact our support team
              </a>
              {errorId && ` with error ID: ${errorId}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized error boundaries for different contexts
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary level="page">{children}</ErrorBoundary>
}

export function ComponentErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary level="component">{children}</ErrorBoundary>
}

export function CriticalErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary level="critical">{children}</ErrorBoundary>
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error) => {
    throw error
  }
}
