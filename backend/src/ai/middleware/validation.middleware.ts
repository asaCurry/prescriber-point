/**
 * Enhanced validation middleware for AI/MCP operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AIServiceException } from '../exceptions/ai-service.exceptions';

export interface ValidationContext {
  operation: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: any;
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  sanitized?: T;
}

@Injectable()
export class AIValidationMiddleware {
  private readonly logger = new Logger(AIValidationMiddleware.name);

  /**
   * Enhanced NDC validation with multiple formats
   */
  static readonly NDCSchema = z
    .string()
    .min(4, 'NDC must be at least 4 characters')
    .max(20, 'NDC too long')
    .transform((val) => val.trim().replace(/\s+/g, ''))
    .refine(
      (val) => {
        // Allow various NDC formats
        const patterns = [
          /^\d{11}$/, // 11 digits no hyphens
          /^\d{10}$/, // 10 digits no hyphens
          /^\d{4,5}-\d{3,4}-?\d{0,2}$/, // Standard hyphenated format
          /^[0-9*]{4,11}$/, // Wildcards allowed for partial searches
        ];
        return patterns.some((pattern) => pattern.test(val));
      },
      {
        message:
          'Invalid NDC format. Expected formats: 12345-678-90, 12345678901, or partial with wildcards',
      },
    );

  /**
   * Drug identifier validation with context-aware suggestions
   */
  static readonly DrugIdentifierSchema = z.object({
    type: z.enum(['ndc', 'brand_name', 'generic_name', 'upc', 'rxcui', 'unii']),
    value: z
      .string()
      .min(1, 'Identifier value cannot be empty')
      .max(200, 'Identifier value too long'),
  });

  /**
   * Batch enrichment request validation
   */
  static readonly EnrichmentRequestSchema = z.object({
    identifiers: z
      .array(AIValidationMiddleware.DrugIdentifierSchema)
      .min(1, 'At least one identifier is required')
      .max(50, 'Too many identifiers (max 50)')
      .refine(
        (identifiers) => {
          // Check for duplicates
          const seen = new Set();
          for (const id of identifiers) {
            const key = `${id.type}:${id.value.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        },
        { message: 'Duplicate identifiers not allowed' },
      ),
    context: z.string().max(2000, 'Context too long').optional(),
    includeConfidence: z.boolean().default(true),
    validateIdentifiers: z.boolean().default(true),
  });

  /**
   * Related drug data validation
   */
  static readonly RelatedDrugSchema = z.object({
    name: z.string().min(1, 'Drug name is required').max(200, 'Drug name too long'),
    ndc: z.string().optional(),
    brandName: z.string().max(200).optional(),
    genericName: z.string().max(200).optional(),
    manufacturer: z.string().max(200).optional(),
    indication: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    relationshipType: z
      .enum(['similar_indication', 'same_class', 'alternative', 'generic_equivalent'])
      .optional(),
    confidenceScore: z.number().min(0).max(1).optional(),
    metadata: z.any().optional(),
  });

  /**
   * Validate and sanitize input with comprehensive error handling
   */
  async validateInput<T>(
    schema: z.ZodSchema<T>,
    input: unknown,
    context: ValidationContext,
  ): Promise<ValidationResult<T>> {
    try {
      this.logger.debug(`Validating input for operation: ${context.operation}`);

      // Pre-validation sanitization
      const sanitized = this.sanitizeInput(input);

      // Parse and validate
      const result = schema.safeParse(sanitized);

      if (result.success) {
        this.logger.debug(`Validation successful for ${context.operation}`);
        return {
          success: true,
          data: result.data,
          sanitized: result.data,
        };
      }

      // Format validation errors with context
      const errors = result.error.errors.map((err) => {
        const path = err.path.length > 0 ? ` at ${err.path.join('.')}` : '';
        return `${err.message}${path}`;
      });

      // Generate helpful suggestions
      const suggestions = this.generateSuggestions(result.error, context);

      this.logger.warn(`Validation failed for ${context.operation}: ${errors.join(', ')}`, {
        correlationId: context.correlationId,
      });

      return {
        success: false,
        errors,
        warnings: suggestions,
      };
    } catch (error) {
      this.logger.error(`Validation error for ${context.operation}:`, error, {
        correlationId: context.correlationId,
      });

      return {
        success: false,
        errors: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Validate multiple items with detailed reporting
   */
  async validateBatch<T>(
    schema: z.ZodSchema<T>,
    inputs: unknown[],
    context: ValidationContext,
  ): Promise<{
    validItems: T[];
    invalidItems: Array<{ index: number; item: unknown; errors: string[] }>;
    summary: { total: number; valid: number; invalid: number };
  }> {
    const validItems: T[] = [];
    const invalidItems: Array<{ index: number; item: unknown; errors: string[] }> = [];

    for (let i = 0; i < inputs.length; i++) {
      const result = await this.validateInput(schema, inputs[i], {
        ...context,
        operation: `${context.operation}[${i}]`,
      });

      if (result.success && result.data) {
        validItems.push(result.data);
      } else {
        invalidItems.push({
          index: i,
          item: inputs[i],
          errors: result.errors || ['Unknown validation error'],
        });
      }
    }

    return {
      validItems,
      invalidItems,
      summary: {
        total: inputs.length,
        valid: validItems.length,
        invalid: invalidItems.length,
      },
    };
  }

  /**
   * Input sanitization
   */
  private sanitizeInput(input: unknown): unknown {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters but preserve medical text
      return input.trim().replace(/[<>]/g, '');
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Generate context-aware suggestions for validation errors
   */
  private generateSuggestions(error: z.ZodError, context: ValidationContext): string[] {
    const suggestions: string[] = [];

    for (const issue of error.issues) {
      switch (issue.code) {
        case z.ZodIssueCode.too_small:
          if (issue.path.includes('identifiers')) {
            suggestions.push(
              'Try providing at least one drug identifier (NDC, brand name, or generic name)',
            );
          } else if (issue.path.includes('ndc')) {
            suggestions.push('NDC should be at least 4 characters (e.g., 12345-678-90)');
          }
          break;

        case z.ZodIssueCode.too_big:
          if (issue.path.includes('identifiers')) {
            suggestions.push('Too many identifiers provided. Maximum is 50 per batch');
          }
          break;

        case z.ZodIssueCode.invalid_enum_value:
          if (issue.path.includes('type')) {
            suggestions.push('Valid identifier types are: NDC, BRAND_NAME, GENERIC_NAME, UPC');
          }
          break;

        case z.ZodIssueCode.custom:
          if (issue.path.includes('ndc')) {
            suggestions.push(
              'Try these NDC formats: 12345-678-90, 1234567890, or 12345678901',
              'Remove any spaces or special characters',
              'Verify the NDC is correct and FDA-approved',
            );
          }
          break;
      }
    }

    // Operation-specific suggestions
    if (context.operation.includes('enrich')) {
      suggestions.push(
        'For best results, provide complete drug identifiers including NDC when available',
      );
    }

    return suggestions;
  }

  /**
   * Validate request rate limits and quotas
   */
  async validateRateLimit(): Promise<{
    allowed: boolean;
    retryAfter?: number;
    remaining?: number;
  }> {
    // This would integrate with your rate limiting service
    // For now, return a simple implementation
    return { allowed: true };
  }

  /**
   * Validate API key and permissions
   */
  async validateApiAccess(
    operation: string,
    apiKey?: string,
    permissions?: string[],
  ): Promise<{ valid: boolean; permissions: string[]; message?: string }> {
    // This would integrate with your authentication service
    return { valid: true, permissions: permissions || [] };
  }

  /**
   * Create validation exception from result
   */
  createValidationException(
    result: ValidationResult,
    context: ValidationContext,
  ): AIServiceException {
    return AIServiceException.validationFailed(result.errors || ['Unknown validation error'], {
      suggestions: result.warnings,
      correlationId: context.correlationId,
      details: {
        operation: context.operation,
        metadata: context.metadata,
      },
    });
  }

  /**
   * Validate medical content for safety
   */
  async validateMedicalContent(content: string): Promise<{
    safe: boolean;
    warnings: string[];
    sanitized?: string;
  }> {
    const warnings: string[] = [];
    let safe = true;

    // Check for potentially dangerous medical advice
    const dangerousPatterns = [
      /stop taking.*medication/i,
      /don't.*see.*doctor/i,
      /ignore.*warning/i,
      /increase.*dose.*without/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        warnings.push('Content may contain inappropriate medical advice');
        safe = false;
        break;
      }
    }

    return { safe, warnings, sanitized: content };
  }
}
