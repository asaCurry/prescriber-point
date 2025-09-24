import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AIService, DrugEnrichmentResult } from './ai.service';
import { AIErrorTrackingService } from './services/ai-error-tracking.service';
import { FDADrugLabelResult } from '../drugs/dto/fda-label.dto';

@ApiTags('ai')
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly errorTracking: AIErrorTrackingService,
  ) {}

  @Post('enrich-drug')
  @ApiOperation({ summary: 'Enrich FDA drug data with AI-generated content' })
  @ApiResponse({
    status: 200,
    description: 'Successfully enriched drug data',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid FDA data provided',
  })
  @ApiResponse({
    status: 500,
    description: 'AI enrichment failed',
  })
  async enrichDrugData(@Body() fdaData: FDADrugLabelResult): Promise<DrugEnrichmentResult> {
    try {
      if (!fdaData || !fdaData.openfda) {
        throw new HttpException('Invalid FDA data provided', HttpStatus.BAD_REQUEST);
      }

      const enrichmentResult = await this.aiService.enrichDrugData(fdaData);
      return enrichmentResult;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('AI enrichment controller error:', error);
      throw new HttpException('Failed to enrich drug data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get AI service health status and error metrics' })
  @ApiResponse({
    status: 200,
    description: 'AI service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        message: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            totalErrors: { type: 'number' },
            errorsByType: { type: 'object' },
            errorsByOperation: { type: 'object' },
            consecutiveFailures: { type: 'number' },
            averageResponseTime: { type: 'number' },
            successRate: { type: 'number' },
          },
        },
      },
    },
  })
  getHealthStatus() {
    return this.errorTracking.getHealthStatus();
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get recent AI service errors' })
  @ApiResponse({
    status: 200,
    description: 'Recent AI service errors',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          errorType: { type: 'string' },
          errorMessage: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    },
  })
  getRecentErrors() {
    return this.errorTracking.getRecentErrors(20);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get AI service error metrics' })
  @ApiResponse({
    status: 200,
    description: 'AI service error metrics',
    schema: {
      type: 'object',
      properties: {
        totalErrors: { type: 'number' },
        errorsByType: { type: 'object' },
        errorsByOperation: { type: 'object' },
        lastErrorTime: { type: 'string', format: 'date-time' },
        consecutiveFailures: { type: 'number' },
        averageResponseTime: { type: 'number' },
        successRate: { type: 'number' },
      },
    },
  })
  getErrorMetrics() {
    return this.errorTracking.getErrorMetrics();
  }
}
