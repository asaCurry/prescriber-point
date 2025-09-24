/**
 * Comprehensive monitoring and logging service for AI/MCP operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerFactory, CircuitBreakerMetrics } from '../utils/circuit-breaker';
import { AIErrorType } from '../exceptions/ai-service.exceptions';

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  errorType?: AIErrorType;
  timestamp: Date;
  correlationId?: string;
  metadata?: any;
}

export interface HealthStatus {
  service: string;
  healthy: boolean;
  lastCheck: Date;
  details: any;
}

export interface SystemMetrics {
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  performance: {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    errors: Record<AIErrorType, number>;
  };
  health: Record<string, HealthStatus>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 10000; // Keep last 10k entries
  private readonly healthChecks = new Map<string, HealthStatus>();

  /**
   * Record performance metrics for an operation
   */
  recordPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceMetric: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.performanceHistory.push(performanceMetric);

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    // Log slow operations
    if (performanceMetric.duration > 5000) {
      // 5 seconds
      this.logger.warn(`Slow operation detected: ${metrics.operationName}`, {
        duration: metrics.duration,
        correlationId: metrics.correlationId,
        success: metrics.success,
      });
    }

    // Log failed operations
    if (!performanceMetric.success) {
      this.logger.error(`Operation failed: ${metrics.operationName}`, {
        errorType: metrics.errorType,
        duration: metrics.duration,
        correlationId: metrics.correlationId,
        metadata: metrics.metadata,
      });
    }
  }

  /**
   * Measure and record operation performance
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    correlationId?: string,
    metadata?: any,
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let errorType: AIErrorType | undefined;

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (error) {
      errorType = this.classifyError(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.recordPerformance({
        operationName,
        duration,
        success,
        errorType,
        correlationId,
        metadata,
      });
    }
  }

  /**
   * Record health status for a service
   */
  recordHealthStatus(serviceName: string, healthy: boolean, details: any): void {
    this.healthChecks.set(serviceName, {
      service: serviceName,
      healthy,
      lastCheck: new Date(),
      details,
    });
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const circuitBreakers = CircuitBreakerFactory.getAllMetrics();
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000); // Last hour

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter((m) => m.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;

    // Count errors by type
    const errors: Record<AIErrorType, number> = {} as any;
    recentMetrics
      .filter((m) => !m.success && m.errorType)
      .forEach((m) => {
        if (m.errorType) {
          errors[m.errorType] = (errors[m.errorType] || 0) + 1;
        }
      });

    // Convert health checks map to object
    const health: Record<string, HealthStatus> = {};
    this.healthChecks.forEach((status, service) => {
      health[service] = status;
    });

    return {
      circuitBreakers,
      performance: {
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        totalRequests,
        errors,
      },
      health,
    };
  }

  /**
   * Get metrics for a specific time period
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.performanceHistory.filter((m) => m.timestamp >= cutoff);
  }

  /**
   * Classify error types from exceptions
   */
  private classifyError(error: any): AIErrorType {
    if (error.errorType) {
      return error.errorType;
    }

    const message = error.message?.toLowerCase() || '';

    if (message.includes('rate limit')) {
      return AIErrorType.FDA_RATE_LIMIT;
    } else if (message.includes('not found')) {
      return AIErrorType.FDA_NOT_FOUND;
    } else if (message.includes('timeout')) {
      return AIErrorType.FDA_TIMEOUT;
    } else if (message.includes('validation') || message.includes('invalid')) {
      return AIErrorType.VALIDATION_ERROR;
    } else if (message.includes('circuit breaker')) {
      return AIErrorType.CIRCUIT_BREAKER_OPEN;
    } else {
      return AIErrorType.INTERNAL_ERROR;
    }
  }

  /**
   * Check health of critical services
   */
  async runHealthChecks(): Promise<Record<string, HealthStatus>> {
    // Check circuit breaker health
    const circuitBreakerMetrics = CircuitBreakerFactory.getAllMetrics();

    Object.entries(circuitBreakerMetrics).forEach(([name, metrics]) => {
      this.recordHealthStatus(`circuit_breaker_${name.toLowerCase()}`, metrics.state === 'CLOSED', {
        state: metrics.state,
        failureRate:
          metrics.totalRequests > 0 ? (metrics.totalFailures / metrics.totalRequests) * 100 : 0,
        lastFailure: metrics.lastFailureTime,
      });
    });

    // Check system performance
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const recentSuccessRate =
      recentMetrics.length > 0
        ? (recentMetrics.filter((m) => m.success).length / recentMetrics.length) * 100
        : 100;

    this.recordHealthStatus('system_performance', recentSuccessRate >= 95, {
      successRate: recentSuccessRate,
      requestCount: recentMetrics.length,
      averageResponseTime:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
          : 0,
    });

    // Convert to object and return
    const result: Record<string, HealthStatus> = {};
    this.healthChecks.forEach((status, service) => {
      result[service] = status;
    });

    return result;
  }

  /**
   * Get alert-worthy issues
   */
  getAlerts(): Array<{ level: 'warning' | 'error'; message: string; details: any }> {
    const alerts: Array<{ level: 'warning' | 'error'; message: string; details: any }> = [];
    const systemMetrics = this.getSystemMetrics();

    // Check circuit breaker alerts
    Object.entries(systemMetrics.circuitBreakers).forEach(([name, metrics]) => {
      if (metrics.state === 'OPEN') {
        alerts.push({
          level: 'error',
          message: `Circuit breaker ${name} is OPEN`,
          details: {
            state: metrics.state,
            failures: metrics.failures,
            lastFailure: metrics.lastFailureTime,
          },
        });
      } else if (metrics.state === 'HALF_OPEN') {
        alerts.push({
          level: 'warning',
          message: `Circuit breaker ${name} is HALF_OPEN`,
          details: {
            state: metrics.state,
            successes: metrics.successes,
          },
        });
      }
    });

    // Check performance alerts
    if (systemMetrics.performance.successRate < 95) {
      alerts.push({
        level: 'warning',
        message: `Low success rate: ${systemMetrics.performance.successRate}%`,
        details: systemMetrics.performance,
      });
    }

    if (systemMetrics.performance.averageResponseTime > 5000) {
      alerts.push({
        level: 'warning',
        message: `High average response time: ${systemMetrics.performance.averageResponseTime}ms`,
        details: systemMetrics.performance,
      });
    }

    // Check health alerts
    Object.values(systemMetrics.health).forEach((health) => {
      if (!health.healthy) {
        alerts.push({
          level: 'error',
          message: `Service ${health.service} is unhealthy`,
          details: health.details,
        });
      }
    });

    return alerts;
  }

  /**
   * Clear old metrics (maintenance)
   */
  clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    const initialCount = this.performanceHistory.length;

    // Remove old metrics
    while (this.performanceHistory.length > 0 && this.performanceHistory[0].timestamp < cutoff) {
      this.performanceHistory.shift();
    }

    const removedCount = initialCount - this.performanceHistory.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleared ${removedCount} old performance metrics`);
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    timestamp: string;
    metrics: SystemMetrics;
    alerts: Array<{ level: string; message: string; details: any }>;
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getSystemMetrics(),
      alerts: this.getAlerts(),
    };
  }
}
