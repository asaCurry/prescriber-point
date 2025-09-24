import { Injectable, Logger } from '@nestjs/common';

export interface AIErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;
  lastErrorTime?: Date;
  consecutiveFailures: number;
  averageResponseTime: number;
  successRate: number;
}

export interface AIErrorEvent {
  operation: string;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

@Injectable()
export class AIErrorTrackingService {
  private readonly logger = new Logger(AIErrorTrackingService.name);

  private errorMetrics: AIErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByOperation: {},
    consecutiveFailures: 0,
    averageResponseTime: 0,
    successRate: 100,
  };

  private errorHistory: AIErrorEvent[] = [];
  private readonly MAX_ERROR_HISTORY = 100;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  /**
   * Records an AI service error with detailed tracking
   */
  recordError(
    operation: string,
    error: Error,
    requestId?: string,
    metadata?: Record<string, any>,
    responseTime?: number,
  ): void {
    const errorEvent: AIErrorEvent = {
      operation,
      errorType: this.categorizeError(error),
      errorMessage: error.message,
      timestamp: new Date(),
      requestId,
      metadata,
      stackTrace: error.stack,
    };

    // Add to history
    this.errorHistory.unshift(errorEvent);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    }

    // Update metrics
    this.updateErrorMetrics(errorEvent, responseTime);

    // Log detailed error information
    this.logError(errorEvent);

    // Check for consecutive failures
    this.checkConsecutiveFailures();
  }

  /**
   * Records a successful AI service operation
   */
  recordSuccess(operation: string, responseTime?: number): void {
    this.errorMetrics.consecutiveFailures = 0;

    if (responseTime) {
      this.updateAverageResponseTime(responseTime);
    }

    this.updateSuccessRate();

    this.logger.debug(`AI operation '${operation}' completed successfully in ${responseTime}ms`);
  }

  /**
   * Gets current error metrics
   */
  getErrorMetrics(): AIErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Gets recent error history
   */
  getRecentErrors(limit: number = 10): AIErrorEvent[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Checks if AI service should be considered unhealthy
   */
  isServiceUnhealthy(): boolean {
    return (
      this.errorMetrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES ||
      this.errorMetrics.successRate < 50
    );
  }

  /**
   * Gets health status summary
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    metrics: AIErrorMetrics;
  } {
    if (this.isServiceUnhealthy()) {
      return {
        status: 'unhealthy',
        message: `AI service is unhealthy: ${this.errorMetrics.consecutiveFailures} consecutive failures, ${this.errorMetrics.successRate.toFixed(1)}% success rate`,
        metrics: this.errorMetrics,
      };
    }

    if (this.errorMetrics.successRate < 80 || this.errorMetrics.consecutiveFailures >= 2) {
      return {
        status: 'degraded',
        message: `AI service is degraded: ${this.errorMetrics.successRate.toFixed(1)}% success rate, ${this.errorMetrics.consecutiveFailures} consecutive failures`,
        metrics: this.errorMetrics,
      };
    }

    return {
      status: 'healthy',
      message: 'AI service is operating normally',
      metrics: this.errorMetrics,
    };
  }

  /**
   * Resets error metrics (useful for testing or manual reset)
   */
  resetMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByOperation: {},
      consecutiveFailures: 0,
      averageResponseTime: 0,
      successRate: 100,
    };
    this.errorHistory = [];
    this.logger.log('AI error metrics reset');
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return 'RATE_LIMIT';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }

    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'AUTHENTICATION_ERROR';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'AUTHORIZATION_ERROR';
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'NOT_FOUND';
    }

    if (message.includes('server error') || message.includes('500')) {
      return 'SERVER_ERROR';
    }

    if (message.includes('parse') || message.includes('json')) {
      return 'PARSE_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  private updateErrorMetrics(errorEvent: AIErrorEvent, responseTime?: number): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastErrorTime = errorEvent.timestamp;
    this.errorMetrics.consecutiveFailures++;

    // Update error counts by type
    this.errorMetrics.errorsByType[errorEvent.errorType] =
      (this.errorMetrics.errorsByType[errorEvent.errorType] || 0) + 1;

    // Update error counts by operation
    this.errorMetrics.errorsByOperation[errorEvent.operation] =
      (this.errorMetrics.errorsByOperation[errorEvent.operation] || 0) + 1;

    // Update average response time if provided
    if (responseTime) {
      this.updateAverageResponseTime(responseTime);
    }

    this.updateSuccessRate();
  }

  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.errorMetrics.averageResponseTime;
    const totalOperations = this.errorMetrics.totalErrors + (100 - this.errorMetrics.successRate);

    if (totalOperations === 0) {
      this.errorMetrics.averageResponseTime = responseTime;
    } else {
      this.errorMetrics.averageResponseTime =
        (currentAvg * (totalOperations - 1) + responseTime) / totalOperations;
    }
  }

  private updateSuccessRate(): void {
    const totalOperations = this.errorMetrics.totalErrors + (100 - this.errorMetrics.successRate);
    if (totalOperations > 0) {
      this.errorMetrics.successRate =
        ((totalOperations - this.errorMetrics.totalErrors) / totalOperations) * 100;
    }
  }

  private logError(errorEvent: AIErrorEvent): void {
    const logContext = {
      operation: errorEvent.operation,
      errorType: errorEvent.errorType,
      requestId: errorEvent.requestId,
      metadata: errorEvent.metadata,
      consecutiveFailures: this.errorMetrics.consecutiveFailures,
      totalErrors: this.errorMetrics.totalErrors,
    };

    if (this.errorMetrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.logger.error(
        `AI service consecutive failure #${this.errorMetrics.consecutiveFailures}: ${errorEvent.errorMessage}`,
        errorEvent.stackTrace,
        logContext,
      );
    } else if (this.errorMetrics.consecutiveFailures >= 2) {
      this.logger.warn(
        `AI service error #${this.errorMetrics.consecutiveFailures}: ${errorEvent.errorMessage}`,
        logContext,
      );
    } else {
      this.logger.log(`AI service error: ${errorEvent.errorMessage}`, logContext);
    }
  }

  private checkConsecutiveFailures(): void {
    if (this.errorMetrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.logger.error(
        `AI service has ${this.errorMetrics.consecutiveFailures} consecutive failures. Service may be unhealthy.`,
      );
    }
  }
}
