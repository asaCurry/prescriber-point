import axios, { AxiosError, AxiosResponse } from 'axios'

// Enhanced error types for better error handling
export interface APIError {
  message: string
  status?: number
  code?: string
  details?: any
  retryable: boolean
  timestamp: Date
}

export interface APIResponse<T = any> {
  data: T
  success: boolean
  error?: APIError
}

// Enhanced API client with comprehensive error handling
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor for logging and adding correlation IDs
api.interceptors.request.use(
  (config) => {
    // Add correlation ID for request tracking
    config.headers['X-Correlation-ID'] =
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        correlationId: config.headers['X-Correlation-ID'],
      })
    }

    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for comprehensive error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          correlationId: response.config.headers['X-Correlation-ID'],
          dataLength: Array.isArray(response.data) ? response.data.length : 'object',
        }
      )
    }

    return response
  },
  (error: AxiosError) => {
    const enhancedError = enhanceError(error)

    // Log error with context
    console.error('❌ API Error:', {
      message: enhancedError.message,
      status: enhancedError.status,
      code: enhancedError.code,
      url: error.config?.url,
      method: error.config?.method,
      correlationId: error.config?.headers?.['X-Correlation-ID'],
      retryable: enhancedError.retryable,
      timestamp: enhancedError.timestamp,
    })

    return Promise.reject(enhancedError)
  }
)

// Enhanced error classification and handling
function enhanceError(error: AxiosError): APIError {
  const timestamp = new Date()

  // Network errors (no response received)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout - please try again',
        code: 'TIMEOUT',
        retryable: true,
        timestamp,
      }
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
        retryable: true,
        timestamp,
      }
    }

    return {
      message: 'Network error - please try again',
      code: 'NETWORK_ERROR',
      retryable: true,
      timestamp,
    }
  }

  // HTTP status code errors
  const status = error.response.status
  const data = error.response.data as any

  switch (status) {
    case 400:
      return {
        message: data?.message || 'Invalid request - please check your input',
        status,
        code: 'BAD_REQUEST',
        details: data,
        retryable: false,
        timestamp,
      }

    case 401:
      return {
        message: 'Authentication required',
        status,
        code: 'UNAUTHORIZED',
        retryable: false,
        timestamp,
      }

    case 403:
      return {
        message: 'Access denied - insufficient permissions',
        status,
        code: 'FORBIDDEN',
        retryable: false,
        timestamp,
      }

    case 404:
      return {
        message: data?.message || 'Resource not found',
        status,
        code: 'NOT_FOUND',
        details: data,
        retryable: false,
        timestamp,
      }

    case 409:
      return {
        message: data?.message || 'Conflict - resource already exists',
        status,
        code: 'CONFLICT',
        details: data,
        retryable: false,
        timestamp,
      }

    case 422:
      return {
        message: data?.message || 'Validation failed',
        status,
        code: 'VALIDATION_ERROR',
        details: data,
        retryable: false,
        timestamp,
      }

    case 429:
      return {
        message: 'Rate limit exceeded - please wait before trying again',
        status,
        code: 'RATE_LIMIT',
        retryable: true,
        timestamp,
      }

    case 500:
      return {
        message: 'Internal server error - please try again later',
        status,
        code: 'SERVER_ERROR',
        retryable: true,
        timestamp,
      }

    case 502:
    case 503:
    case 504:
      return {
        message: 'Service temporarily unavailable - please try again later',
        status,
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
        timestamp,
      }

    default:
      return {
        message: data?.message || `Request failed with status ${status}`,
        status,
        code: 'UNKNOWN_ERROR',
        details: data,
        retryable: status >= 500,
        timestamp,
      }
  }
}

// Retry logic for retryable errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: APIError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as APIError

      // Don't retry if error is not retryable or we've exhausted retries
      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)

      console.log(`🔄 Retrying request (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Enhanced API methods with error handling
export const enhancedApi = {
  async get<T>(url: string, config?: any): Promise<APIResponse<T>> {
    try {
      const response = await api.get<T>(url, config)
      return {
        data: response.data,
        success: true,
      }
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error as APIError,
      }
    }
  },

  async post<T>(url: string, data?: any, config?: any): Promise<APIResponse<T>> {
    try {
      const response = await api.post<T>(url, data, config)
      return {
        data: response.data,
        success: true,
      }
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error as APIError,
      }
    }
  },

  async put<T>(url: string, data?: any, config?: any): Promise<APIResponse<T>> {
    try {
      const response = await api.put<T>(url, data, config)
      return {
        data: response.data,
        success: true,
      }
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error as APIError,
      }
    }
  },

  async delete<T>(url: string, config?: any): Promise<APIResponse<T>> {
    try {
      const response = await api.delete<T>(url, config)
      return {
        data: response.data,
        success: true,
      }
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error as APIError,
      }
    }
  },
}

// Utility function to check if an error is retryable
export function isRetryableError(error: any): boolean {
  return error?.retryable === true
}

// Utility function to get user-friendly error message
export function getUserFriendlyErrorMessage(error: APIError): string {
  const suggestions: Record<string, string[]> = {
    TIMEOUT: [
      '⏳ The request took too long to complete',
      '💡 Try again in a moment',
      '🔄 Consider reducing the amount of data requested',
    ],
    NETWORK_ERROR: [
      '🌐 Check your internet connection',
      '🔄 Try refreshing the page',
      '💡 The server might be temporarily unavailable',
    ],
    RATE_LIMIT: [
      "⏳ You're making requests too quickly",
      '💡 Wait a moment before trying again',
      '🔄 Consider reducing the frequency of requests',
    ],
    SERVER_ERROR: [
      '🔧 Something went wrong on our end',
      '💡 Please try again in a few minutes',
      '📧 If the problem persists, contact support',
    ],
    SERVICE_UNAVAILABLE: [
      '🚧 The service is temporarily unavailable',
      '💡 Please try again later',
      '📊 Check our status page for updates',
    ],
  }

  const errorSuggestions = suggestions[error.code || ''] || [
    '🔄 Please try again',
    '💡 If the problem persists, contact support',
  ]

  return `${error.message}\n\nSuggestions:\n${errorSuggestions.map((s) => `• ${s}`).join('\n')}`
}

export default api
