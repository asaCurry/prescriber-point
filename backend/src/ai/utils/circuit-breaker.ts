/**
 * Circuit breaker pattern implementation for external API calls
 */

import { Logger } from '@nestjs/common';
import { AIServiceException } from '../exceptions/ai-service.exceptions';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Timeout before attempting half-open (ms) */
  timeout: number;
  /** Reset timeout after successful requests (ms) */
  resetTimeout: number;
  /** Monitor window for failure counting (ms) */
  monitoringPeriod: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt?: Date;
  private readonly logger = new Logger(`CircuitBreaker:${this.name}`);

  // Metrics tracking
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly startTime = new Date();

  // Failure tracking within monitoring window
  private readonly failureHistory: Date[] = [];

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (!this.canExecute()) {
      const waitTime = this.getWaitTime();
      throw AIServiceException.circuitBreakerOpen(this.name, waitTime);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can be executed based on circuit state
   */
  private canExecute(): boolean {
    this.cleanupFailureHistory();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (this.shouldAttemptReset()) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.successes = 0;
          this.logger.log(`Circuit breaker transitioning to HALF_OPEN state`);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.reset();
        this.logger.log(`Circuit breaker reset to CLOSED state after ${this.successes} successes`);
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on successful request
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = new Date();
    this.failureHistory.push(this.lastFailureTime);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.openCircuit();
      this.logger.warn(`Circuit breaker opened from HALF_OPEN state due to failure`);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
        this.logger.warn(
          `Circuit breaker opened due to ${this.getRecentFailureCount()} failures in ${this.config.monitoringPeriod}ms`,
        );
      }
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    const recentFailures = this.getRecentFailureCount();
    return recentFailures >= this.config.failureThreshold;
  }

  /**
   * Get number of failures within monitoring period
   */
  private getRecentFailureCount(): number {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    return this.failureHistory.filter((failureTime) => failureTime >= cutoff).length;
  }

  /**
   * Check if should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.timeout);
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = undefined;
    this.failureHistory.length = 0; // Clear failure history
  }

  /**
   * Clean up old failure history outside monitoring window
   */
  private cleanupFailureHistory(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    const validFailures = this.failureHistory.filter((failureTime) => failureTime >= cutoff);
    this.failureHistory.length = 0;
    this.failureHistory.push(...validFailures);
  }

  /**
   * Get wait time until next attempt (for OPEN state)
   */
  private getWaitTime(): number {
    if (this.state !== CircuitBreakerState.OPEN || !this.nextAttempt) {
      return 0;
    }
    return Math.max(0, this.nextAttempt.getTime() - Date.now());
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.getRecentFailureCount(),
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Force reset circuit breaker (for admin/testing purposes)
   */
  forceReset(): void {
    this.logger.log(`Circuit breaker force reset`);
    this.reset();
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    state: CircuitBreakerState;
    failureRate: number;
    nextAttemptIn?: number;
  } {
    const failureRate =
      this.totalRequests > 0 ? (this.totalFailures / this.totalRequests) * 100 : 0;

    return {
      healthy: this.state === CircuitBreakerState.CLOSED,
      state: this.state,
      failureRate: Math.round(failureRate * 100) / 100,
      nextAttemptIn: this.state === CircuitBreakerState.OPEN ? this.getWaitTime() : undefined,
    };
  }
}

/**
 * Circuit breaker factory with common configurations
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static getFDACircuitBreaker(): CircuitBreaker {
    if (!this.breakers.has('FDA_API')) {
      this.breakers.set(
        'FDA_API',
        new CircuitBreaker('FDA_API', {
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 60000, // 1 minute
          resetTimeout: 30000, // 30 seconds
          monitoringPeriod: 300000, // 5 minutes
        }),
      );
    }
    return this.breakers.get('FDA_API')!;
  }

  static getAICircuitBreaker(): CircuitBreaker {
    if (!this.breakers.has('AI_SERVICE')) {
      this.breakers.set(
        'AI_SERVICE',
        new CircuitBreaker('AI_SERVICE', {
          failureThreshold: 3,
          successThreshold: 2,
          timeout: 120000, // 2 minutes
          resetTimeout: 60000, // 1 minute
          monitoringPeriod: 600000, // 10 minutes
        }),
      );
    }
    return this.breakers.get('AI_SERVICE')!;
  }

  static getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  static resetAll(): void {
    this.breakers.forEach((breaker) => breaker.forceReset());
  }
}
