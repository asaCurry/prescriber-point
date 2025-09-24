import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler());

    if (!options) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientId(request);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    const clientData = this.requests.get(clientId);

    if (!clientData) {
      // First request from this client
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (now > clientData.resetTime) {
      // Window has expired, reset
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (clientData.count >= options.max) {
      // Rate limit exceeded
      const resetTime = new Date(clientData.resetTime).toISOString();
      throw new HttpException(
        {
          message: options.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
          resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    clientData.count++;
    return true;
  }

  private getClientId(request: any): string {
    // Use IP address as client identifier
    const forwarded = request.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : request.connection.remoteAddress;
    return ip || 'unknown';
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [clientId, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(clientId);
      }
    }
  }
}

// Decorator for easy use
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (options: RateLimitOptions) => SetMetadata('rateLimit', options);
