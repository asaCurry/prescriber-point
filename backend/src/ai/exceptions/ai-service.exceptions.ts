/**
 * Enhanced error handling for AI/MCP services
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export enum AIErrorType {
  // Input validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_IDENTIFIER = 'INVALID_IDENTIFIER',
  INVALID_NDC_FORMAT = 'INVALID_NDC_FORMAT',

  // External API errors
  FDA_API_ERROR = 'FDA_API_ERROR',
  FDA_RATE_LIMIT = 'FDA_RATE_LIMIT',
  FDA_NOT_FOUND = 'FDA_NOT_FOUND',
  FDA_TIMEOUT = 'FDA_TIMEOUT',

  // AI/LLM errors
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_CONTENT_FILTER = 'AI_CONTENT_FILTER',
  AI_TIMEOUT = 'AI_TIMEOUT',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Business logic errors
  ENRICHMENT_FAILED = 'ENRICHMENT_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface AIErrorContext {
  identifier?: {
    type: string;
    value: string;
  };
  suggestions?: string[];
  retryAfter?: number;
  details?: any;
  correlationId?: string;
  timestamp?: Date;
}

export class AIServiceException extends HttpException {
  public readonly errorType: AIErrorType;
  public readonly context: AIErrorContext;
  public readonly isRetryable: boolean;
  public readonly correlationId: string;

  constructor(
    errorType: AIErrorType,
    message: string,
    context: AIErrorContext = {},
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    isRetryable: boolean = false,
  ) {
    super(
      {
        error: errorType,
        message,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId || AIServiceException.generateCorrelationId(),
        ...context,
      },
      httpStatus,
    );

    this.errorType = errorType;
    this.context = context;
    this.isRetryable = isRetryable;
    this.correlationId = context.correlationId || AIServiceException.generateCorrelationId();
  }

  private static generateCorrelationId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  static invalidInput(message: string, context: AIErrorContext = {}): AIServiceException {
    return new AIServiceException(
      AIErrorType.INVALID_INPUT,
      message,
      context,
      HttpStatus.BAD_REQUEST,
      false,
    );
  }

  static invalidIdentifier(
    identifier: { type: string; value: string },
    suggestions?: string[],
  ): AIServiceException {
    return new AIServiceException(
      AIErrorType.INVALID_IDENTIFIER,
      `Invalid ${identifier.type}: "${identifier.value}"`,
      {
        identifier,
        suggestions,
      },
      HttpStatus.BAD_REQUEST,
      false,
    );
  }

  static fdaApiError(message: string, isRetryable: boolean = true): AIServiceException {
    return new AIServiceException(
      AIErrorType.FDA_API_ERROR,
      `FDA API error: ${message}`,
      { retryAfter: isRetryable ? 5000 : undefined },
      HttpStatus.BAD_GATEWAY,
      isRetryable,
    );
  }

  static fdaRateLimit(retryAfter: number = 60000): AIServiceException {
    return new AIServiceException(
      AIErrorType.FDA_RATE_LIMIT,
      'FDA API rate limit exceeded',
      { retryAfter },
      HttpStatus.TOO_MANY_REQUESTS,
      true,
    );
  }

  static fdaNotFound(identifier: string): AIServiceException {
    return new AIServiceException(
      AIErrorType.FDA_NOT_FOUND,
      `Drug not found in FDA database: ${identifier}`,
      {},
      HttpStatus.NOT_FOUND,
      false,
    );
  }

  static aiModelError(message: string, isRetryable: boolean = false): AIServiceException {
    return new AIServiceException(
      AIErrorType.AI_MODEL_ERROR,
      `AI model error: ${message}`,
      { retryAfter: isRetryable ? 30000 : undefined },
      HttpStatus.BAD_GATEWAY,
      isRetryable,
    );
  }

  static enrichmentFailed(
    identifier: { type: string; value: string },
    originalError: Error,
  ): AIServiceException {
    return new AIServiceException(
      AIErrorType.ENRICHMENT_FAILED,
      `Failed to enrich ${identifier.type}:${identifier.value}`,
      {
        identifier,
        details: originalError.message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
      true,
    );
  }

  static circuitBreakerOpen(service: string, retryAfter: number = 30000): AIServiceException {
    return new AIServiceException(
      AIErrorType.CIRCUIT_BREAKER_OPEN,
      `${service} circuit breaker is open`,
      { retryAfter },
      HttpStatus.SERVICE_UNAVAILABLE,
      true,
    );
  }

  static validationFailed(
    validationErrors: string[],
    context: AIErrorContext = {},
  ): AIServiceException {
    return new AIServiceException(
      AIErrorType.VALIDATION_FAILED,
      `Validation failed: ${validationErrors.join(', ')}`,
      {
        ...context,
        details: validationErrors,
      },
      HttpStatus.BAD_REQUEST,
      false,
    );
  }

  /**
   * Creates user-friendly error messages for MCP tools
   */
  toMCPResponse(): { content: Array<{ type: string; text: string }>; isError: boolean } {
    const userMessage = this.message;
    let suggestions = '';

    // Add context-specific suggestions
    switch (this.errorType) {
      case AIErrorType.INVALID_NDC_FORMAT:
        suggestions =
          '\n\n💡 **Suggestions:**\n- Use format: 12345-678-90\n- Check for typos\n- Remove extra spaces or characters';
        break;
      case AIErrorType.FDA_RATE_LIMIT:
        suggestions = `\n\n⏳ **Rate Limit:** Please wait ${Math.ceil((this.context.retryAfter || 60000) / 1000)} seconds before retrying.`;
        break;
      case AIErrorType.FDA_NOT_FOUND:
        suggestions =
          '\n\n💡 **Suggestions:**\n- Verify the NDC or drug name\n- Try a broader search term\n- Check if the drug is FDA-approved';
        break;
      case AIErrorType.AI_MODEL_ERROR:
        suggestions =
          '\n\n🔧 **Next Steps:**\n- Check API key configuration\n- Verify network connectivity\n- Try again in a few moments';
        break;
    }

    const errorText = `❌ **Error:** ${userMessage}${suggestions}\n\n**Error ID:** ${this.correlationId}\n**Time:** ${new Date().toISOString()}`;

    return {
      content: [
        {
          type: 'text',
          text: errorText,
        },
      ],
      isError: true,
    };
  }

  /**
   * Gets retry configuration based on error type
   */
  getRetryConfig(): { shouldRetry: boolean; delay: number; maxAttempts: number } {
    const baseConfig = {
      shouldRetry: this.isRetryable,
      delay: this.context.retryAfter || 1000,
      maxAttempts: 3,
    };

    switch (this.errorType) {
      case AIErrorType.FDA_RATE_LIMIT:
        return { ...baseConfig, delay: this.context.retryAfter || 60000, maxAttempts: 2 };
      case AIErrorType.FDA_TIMEOUT:
        return { ...baseConfig, delay: 5000, maxAttempts: 3 };
      case AIErrorType.AI_MODEL_ERROR:
        return { ...baseConfig, delay: 30000, maxAttempts: 2 };
      case AIErrorType.DATABASE_ERROR:
        return { ...baseConfig, delay: 2000, maxAttempts: 2 };
      default:
        return baseConfig;
    }
  }
}

/**
 * Error classification utilities
 */
export class AIErrorClassifier {
  static classifyFDAError(error: any): AIServiceException {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.response?.status || error.status;

    if (statusCode === 429 || message.includes('rate limit')) {
      return AIServiceException.fdaRateLimit();
    }

    if (statusCode === 404 || message.includes('not found')) {
      return AIServiceException.fdaNotFound(error.identifier || 'unknown');
    }

    if (statusCode >= 500 || message.includes('timeout')) {
      return AIServiceException.fdaApiError(error.message, true);
    }

    return AIServiceException.fdaApiError(error.message, false);
  }

  static classifyAIError(error: any): AIServiceException {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('quota') || message.includes('billing')) {
      return AIServiceException.aiModelError('API quota exceeded', false);
    }

    if (message.includes('timeout')) {
      return new AIServiceException(
        AIErrorType.AI_TIMEOUT,
        'AI model request timed out',
        { retryAfter: 30000 },
        HttpStatus.REQUEST_TIMEOUT,
        true,
      );
    }

    if (message.includes('content') && message.includes('filter')) {
      return new AIServiceException(
        AIErrorType.AI_CONTENT_FILTER,
        'Content filtered by AI safety system',
        {},
        HttpStatus.BAD_REQUEST,
        false,
      );
    }

    return AIServiceException.aiModelError(error.message, true);
  }
}
