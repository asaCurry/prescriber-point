import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { EnrichmentService, EnrichmentBatchResult } from './services/enrichment.service';
import { IdentifierValidationService } from './services/identifier-validation.service';
import {
  EnrichmentRequest,
  DrugIdentifier,
  EnrichmentValidationResult,
} from './dto/enrichment-request.dto';

@ApiTags('enrichment')
@Controller('enrichment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EnrichmentController {
  constructor(
    private readonly enrichmentService: EnrichmentService,
    private readonly validationService: IdentifierValidationService,
  ) {}

  @Post('batch')
  @ApiOperation({
    summary: 'Enrich multiple drug identifiers',
    description:
      'Process multiple drug identifiers (NDC, brand names, etc.) and enrich with AI-generated content',
  })
  @ApiBody({
    type: EnrichmentRequest,
    examples: {
      multiple_ndc: {
        summary: 'Multiple NDC codes',
        value: {
          identifiers: [
            { type: 'ndc', value: '0069-2587-68' },
            { type: 'ndc', value: '0173-0687-55' },
          ],
          context: 'Need dosing information for elderly patients',
          includeConfidence: true,
          validateIdentifiers: true,
        },
      },
      mixed_identifiers: {
        summary: 'Mixed identifier types',
        value: {
          identifiers: [
            { type: 'brand_name', value: 'Lipitor' },
            { type: 'generic_name', value: 'atorvastatin' },
            { type: 'ndc', value: '0069-2587-68' },
          ],
          validateIdentifiers: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enrichment batch completed successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request format or validation errors',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during enrichment',
  })
  async enrichBatch(@Body() request: EnrichmentRequest): Promise<EnrichmentBatchResult> {
    try {
      // Validate request limits
      if (request.identifiers.length > 10) {
        throw new HttpException('Maximum 10 identifiers allowed per batch', HttpStatus.BAD_REQUEST);
      }

      if (request.identifiers.length === 0) {
        throw new HttpException('At least one identifier is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.enrichmentService.enrichMultipleDrugs(request);

      // If all identifiers failed validation, return 400
      if (
        request.validateIdentifiers &&
        result.validationResult.errorCount === request.identifiers.length
      ) {
        throw new HttpException(
          {
            message: 'All identifiers failed validation',
            validationResult: result.validationResult,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Enrichment batch failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate drug identifiers',
    description: 'Validate format and structure of drug identifiers without performing enrichment',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifiers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['ndc', 'upc', 'rxcui', 'unii', 'generic_name', 'brand_name'],
              },
              value: { type: 'string' },
            },
          },
        },
      },
    },
    examples: {
      ndc_validation: {
        summary: 'Validate NDC codes',
        value: {
          identifiers: [
            { type: 'ndc', value: '0069-2587-68' },
            { type: 'ndc', value: '12345' }, // Invalid format
            { type: 'ndc', value: '0173-0687-55' },
          ],
        },
      },
      mixed_validation: {
        summary: 'Validate mixed types',
        value: {
          identifiers: [
            { type: 'rxcui', value: '39998' },
            { type: 'unii', value: 'A74586SNO7' },
            { type: 'brand_name', value: 'Lipitor' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
    type: Object,
  })
  async validateIdentifiers(
    @Body() body: { identifiers: DrugIdentifier[] },
  ): Promise<EnrichmentValidationResult> {
    try {
      if (!body.identifiers || !Array.isArray(body.identifiers)) {
        throw new HttpException('Identifiers array is required', HttpStatus.BAD_REQUEST);
      }

      if (body.identifiers.length > 20) {
        throw new HttpException(
          'Maximum 20 identifiers allowed for validation',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.validationService.validateIdentifiers(body.identifiers);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Validation failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('types')
  @ApiOperation({
    summary: 'Get supported identifier types',
    description: 'Returns list of supported drug identifier types and their validation rules',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported identifier types',
    schema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
              format: { type: 'string' },
              examples: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  async getSupportedTypes() {
    return {
      types: [
        {
          type: 'ndc',
          description: 'National Drug Code - FDA assigned identifier',
          format: 'XXXX-XXXX-XX or XXXXX-XXXX-XX (10-11 digits with hyphens)',
          examples: ['0069-2587-68', '50090-0001-00'],
          validation: 'Must be 10 or 11 digits, optionally with hyphens',
        },
        {
          type: 'upc',
          description: 'Universal Product Code - barcode identifier',
          format: 'XXXXXXXXXXXX (exactly 12 digits)',
          examples: ['012345678901', '987654321098'],
          validation: 'Must be exactly 12 digits with valid check digit',
        },
        {
          type: 'rxcui',
          description: 'RxNorm Concept Unique Identifier',
          format: 'Positive integer',
          examples: ['39998', '284635', '1000001'],
          validation: 'Must be positive integer between 1 and 9,999,999',
        },
        {
          type: 'unii',
          description: 'Unique Ingredient Identifier - FDA substance identifier',
          format: 'XXXXXXXXXX (10 alphanumeric characters)',
          examples: ['A74586SNO7', '9Q963F1K9A'],
          validation: '10 alphanumeric characters (uppercase)',
        },
        {
          type: 'brand_name',
          description: 'Commercial brand name of the drug',
          format: 'Text string',
          examples: ['Lipitor', 'Tylenol', 'Advil'],
          validation: 'Letters, numbers, spaces, and common punctuation allowed',
        },
        {
          type: 'generic_name',
          description: 'Generic (chemical) name of the drug',
          format: 'Text string',
          examples: ['atorvastatin', 'acetaminophen', 'ibuprofen'],
          validation: 'Letters, numbers, spaces, and common punctuation allowed',
        },
      ],
      limits: {
        batchEnrichment: 10,
        validation: 20,
        contextLength: 1000,
      },
      features: {
        validation: 'Format validation and suggestions',
        enrichment: 'AI-powered content generation',
        batchProcessing: 'Multiple identifiers in single request',
        confidenceScoring: 'Quality assessment of enriched content',
        fallbackHandling: 'Graceful degradation for missing data',
      },
    };
  }

  @Get('examples')
  @ApiOperation({
    summary: 'Get usage examples',
    description: 'Returns example requests for different use cases',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['validation', 'enrichment', 'batch'],
    description: 'Filter examples by type',
  })
  async getExamples(@Query('type') type?: string) {
    const examples = {
      validation: {
        description: 'Validate identifiers without enrichment',
        request: {
          identifiers: [
            { type: 'ndc', value: '0069-2587-68' },
            { type: 'rxcui', value: '39998' },
            { type: 'brand_name', value: 'Lipitor' },
          ],
        },
        endpoint: 'POST /enrichment/validate',
      },
      enrichment: {
        description: 'Enrich single drug with context',
        request: {
          identifiers: [{ type: 'ndc', value: '0069-2587-68' }],
          context: 'Need information for geriatric dosing',
          includeConfidence: true,
          validateIdentifiers: true,
        },
        endpoint: 'POST /enrichment/batch',
      },
      batch: {
        description: 'Process multiple drugs at once',
        request: {
          identifiers: [
            { type: 'brand_name', value: 'Lipitor' },
            { type: 'brand_name', value: 'Plavix' },
            { type: 'ndc', value: '0173-0687-55' },
          ],
          context: 'Cardiovascular medication review',
          validateIdentifiers: true,
        },
        endpoint: 'POST /enrichment/batch',
      },
    };

    if (type && examples[type]) {
      return { [type]: examples[type] };
    }

    return examples;
  }
}
