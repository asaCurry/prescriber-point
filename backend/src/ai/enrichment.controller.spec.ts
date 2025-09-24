import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentService, EnrichmentBatchResult } from './services/enrichment.service';
import { IdentifierValidationService } from './services/identifier-validation.service';
import {
  EnrichmentRequest,
  IdentifierType,
  EnrichmentValidationResult,
} from './dto/enrichment-request.dto';

const mockEnrichmentService = {
  enrichMultipleDrugs: jest.fn(),
};

const mockValidationService = {
  validateIdentifiers: jest.fn(),
};

const mockValidationResult: EnrichmentValidationResult = {
  isValid: true,
  validIdentifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
  errors: [],
  warningCount: 0,
  errorCount: 0,
};

const mockBatchResult: EnrichmentBatchResult = {
  requestId: 'test-request-123',
  timestamp: new Date(),
  totalRequested: 1,
  totalProcessed: 1,
  totalErrors: 0,
  validationResult: mockValidationResult,
  results: [
    {
      identifier: { type: IdentifierType.NDC, value: '12345-678-90' },
      status: 'success',
      data: {
        title: 'Test Drug - Information',
        metaDescription: 'Test description',
        slug: 'test-drug',
        summary: 'Test summary',
        indicationSummary: 'Test indication',
        sideEffectsSummary: 'Test side effects',
        dosageSummary: 'Test dosage',
        warningsSummary: 'Test warnings',
        contraindicationsSummary: 'Test contraindications',
        aiGeneratedFaqs: [],
        relatedDrugs: [],
        relatedConditions: [],
        keywords: ['test'],
        structuredData: {},
        confidenceScore: 0.8,
      },
      processingTimeMs: 1500,
      dataSource: 'fda',
    },
  ],
  summary: {
    successRate: 1.0,
    averageConfidence: 0.8,
    processingTimeMs: 1500,
  },
};

describe('EnrichmentController', () => {
  let controller: EnrichmentController;
  let enrichmentService: EnrichmentService;
  let validationService: IdentifierValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrichmentController],
      providers: [
        {
          provide: EnrichmentService,
          useValue: mockEnrichmentService,
        },
        {
          provide: IdentifierValidationService,
          useValue: mockValidationService,
        },
      ],
    }).compile();

    controller = module.get<EnrichmentController>(EnrichmentController);
    enrichmentService = module.get<EnrichmentService>(EnrichmentService);
    validationService = module.get<IdentifierValidationService>(IdentifierValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichBatch', () => {
    it('should successfully process enrichment batch', async () => {
      const request: EnrichmentRequest = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
        validateIdentifiers: false,
      };

      mockEnrichmentService.enrichMultipleDrugs.mockResolvedValue(mockBatchResult);

      const result = await controller.enrichBatch(request);

      expect(enrichmentService.enrichMultipleDrugs).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockBatchResult);
    });

    it('should throw BadRequest when more than 10 identifiers provided', async () => {
      const request: EnrichmentRequest = {
        identifiers: Array(11).fill({ type: IdentifierType.NDC, value: '12345-678-90' }),
        validateIdentifiers: false,
      };

      await expect(controller.enrichBatch(request)).rejects.toThrow(
        new HttpException('Maximum 10 identifiers allowed per batch', HttpStatus.BAD_REQUEST),
      );

      expect(enrichmentService.enrichMultipleDrugs).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when no identifiers provided', async () => {
      const request: EnrichmentRequest = {
        identifiers: [],
        validateIdentifiers: false,
      };

      await expect(controller.enrichBatch(request)).rejects.toThrow(
        new HttpException('At least one identifier is required', HttpStatus.BAD_REQUEST),
      );

      expect(enrichmentService.enrichMultipleDrugs).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when all identifiers fail validation', async () => {
      const request: EnrichmentRequest = {
        identifiers: [{ type: IdentifierType.NDC, value: 'invalid-ndc' }],
        validateIdentifiers: true,
      };

      const failedValidationResult: EnrichmentBatchResult = {
        ...mockBatchResult,
        validationResult: {
          isValid: false,
          validIdentifiers: [],
          errors: [
            {
              identifier: { type: IdentifierType.NDC, value: 'invalid-ndc' },
              errorType: 'INVALID_FORMAT',
              message: 'Invalid NDC format',
            },
          ],
          warningCount: 0,
          errorCount: 1,
        },
      };

      mockEnrichmentService.enrichMultipleDrugs.mockResolvedValue(failedValidationResult);

      await expect(controller.enrichBatch(request)).rejects.toThrow(
        new HttpException(
          {
            message: 'All identifiers failed validation',
            validationResult: failedValidationResult.validationResult,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should re-throw HttpException from service', async () => {
      const request: EnrichmentRequest = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
        validateIdentifiers: false,
      };

      const httpError = new HttpException('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      mockEnrichmentService.enrichMultipleDrugs.mockRejectedValue(httpError);

      await expect(controller.enrichBatch(request)).rejects.toThrow(httpError);
    });

    it('should convert generic errors to InternalServerError', async () => {
      const request: EnrichmentRequest = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
        validateIdentifiers: false,
      };

      const genericError = new Error('Something went wrong');
      mockEnrichmentService.enrichMultipleDrugs.mockRejectedValue(genericError);

      await expect(controller.enrichBatch(request)).rejects.toThrow(
        new HttpException(
          {
            message: 'Enrichment batch failed',
            error: 'Something went wrong',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should allow exactly 10 identifiers', async () => {
      const request: EnrichmentRequest = {
        identifiers: Array(10)
          .fill(0)
          .map((_, i) => ({
            type: IdentifierType.NDC,
            value: `1234${i}-678-90`,
          })),
        validateIdentifiers: false,
      };

      mockEnrichmentService.enrichMultipleDrugs.mockResolvedValue(mockBatchResult);

      const result = await controller.enrichBatch(request);

      expect(enrichmentService.enrichMultipleDrugs).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockBatchResult);
    });

    it('should handle partial validation failures gracefully', async () => {
      const request: EnrichmentRequest = {
        identifiers: [
          { type: IdentifierType.NDC, value: '12345-678-90' },
          { type: IdentifierType.NDC, value: 'invalid-ndc' },
        ],
        validateIdentifiers: true,
      };

      const partialFailureResult: EnrichmentBatchResult = {
        ...mockBatchResult,
        validationResult: {
          isValid: true,
          validIdentifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
          errors: [
            {
              identifier: { type: IdentifierType.NDC, value: 'invalid-ndc' },
              errorType: 'INVALID_FORMAT',
              message: 'Invalid NDC format',
            },
          ],
          warningCount: 0,
          errorCount: 1,
        },
      };

      mockEnrichmentService.enrichMultipleDrugs.mockResolvedValue(partialFailureResult);

      const result = await controller.enrichBatch(request);

      expect(result).toEqual(partialFailureResult);
    });
  });

  describe('validateIdentifiers', () => {
    it('should successfully validate identifiers', async () => {
      const body = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
      };

      mockValidationService.validateIdentifiers.mockResolvedValue(mockValidationResult);

      const result = await controller.validateIdentifiers(body);

      expect(validationService.validateIdentifiers).toHaveBeenCalledWith(body.identifiers);
      expect(result).toEqual(mockValidationResult);
    });

    it('should throw BadRequest when identifiers array is missing', async () => {
      const body = {} as any;

      await expect(controller.validateIdentifiers(body)).rejects.toThrow(
        new HttpException('Identifiers array is required', HttpStatus.BAD_REQUEST),
      );

      expect(validationService.validateIdentifiers).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when identifiers is not an array', async () => {
      const body = { identifiers: 'not-an-array' } as any;

      await expect(controller.validateIdentifiers(body)).rejects.toThrow(
        new HttpException('Identifiers array is required', HttpStatus.BAD_REQUEST),
      );

      expect(validationService.validateIdentifiers).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when more than 20 identifiers provided', async () => {
      const body = {
        identifiers: Array(21).fill({ type: IdentifierType.NDC, value: '12345-678-90' }),
      };

      await expect(controller.validateIdentifiers(body)).rejects.toThrow(
        new HttpException('Maximum 20 identifiers allowed for validation', HttpStatus.BAD_REQUEST),
      );

      expect(validationService.validateIdentifiers).not.toHaveBeenCalled();
    });

    it('should allow exactly 20 identifiers', async () => {
      const body = {
        identifiers: Array(20)
          .fill(0)
          .map((_, i) => ({
            type: IdentifierType.NDC,
            value: `1234${i}-678-90`,
          })),
      };

      mockValidationService.validateIdentifiers.mockResolvedValue(mockValidationResult);

      const result = await controller.validateIdentifiers(body);

      expect(validationService.validateIdentifiers).toHaveBeenCalledWith(body.identifiers);
      expect(result).toEqual(mockValidationResult);
    });

    it('should handle validation service errors', async () => {
      const body = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
      };

      const error = new Error('Validation service error');
      mockValidationService.validateIdentifiers.mockRejectedValue(error);

      await expect(controller.validateIdentifiers(body)).rejects.toThrow(
        new HttpException(
          {
            message: 'Validation failed',
            error: 'Validation service error',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported identifier types', async () => {
      const result = await controller.getSupportedTypes();

      expect(result).toHaveProperty('types');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('features');
      expect(Array.isArray(result.types)).toBe(true);
      expect(result.types).toHaveLength(6);
      expect(result.types[0]).toHaveProperty('type');
      expect(result.types[0]).toHaveProperty('description');
      expect(result.types[0]).toHaveProperty('format');
      expect(result.types[0]).toHaveProperty('examples');
      expect(result.types[0]).toHaveProperty('validation');
    });

    it('should include all expected identifier types', async () => {
      const result = await controller.getSupportedTypes();
      const types = result.types.map((t) => t.type);

      expect(types).toContain('ndc');
      expect(types).toContain('upc');
      expect(types).toContain('rxcui');
      expect(types).toContain('unii');
      expect(types).toContain('brand_name');
      expect(types).toContain('generic_name');
    });

    it('should include correct limits', async () => {
      const result = await controller.getSupportedTypes();

      expect(result.limits.batchEnrichment).toBe(10);
      expect(result.limits.validation).toBe(20);
      expect(result.limits.contextLength).toBe(1000);
    });
  });

  describe('getExamples', () => {
    it('should return all examples when no type filter', async () => {
      const result = await controller.getExamples();

      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('enrichment');
      expect(result).toHaveProperty('batch');
      expect(result.validation).toHaveProperty('description');
      expect(result.validation).toHaveProperty('request');
      expect(result.validation).toHaveProperty('endpoint');
    });

    it('should return filtered examples for validation type', async () => {
      const result = await controller.getExamples('validation');

      expect(result).toHaveProperty('validation');
      expect(result).not.toHaveProperty('enrichment');
      expect(result).not.toHaveProperty('batch');
    });

    it('should return filtered examples for enrichment type', async () => {
      const result = await controller.getExamples('enrichment');

      expect(result).toHaveProperty('enrichment');
      expect(result).not.toHaveProperty('validation');
      expect(result).not.toHaveProperty('batch');
    });

    it('should return filtered examples for batch type', async () => {
      const result = await controller.getExamples('batch');

      expect(result).toHaveProperty('batch');
      expect(result).not.toHaveProperty('validation');
      expect(result).not.toHaveProperty('enrichment');
    });

    it('should return all examples for unknown type', async () => {
      const result = await controller.getExamples('unknown');

      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('enrichment');
      expect(result).toHaveProperty('batch');
    });

    it('should include correct endpoint information', async () => {
      const result = await controller.getExamples();

      expect(result.validation.endpoint).toBe('POST /enrichment/validate');
      expect(result.enrichment.endpoint).toBe('POST /enrichment/batch');
      expect(result.batch.endpoint).toBe('POST /enrichment/batch');
    });
  });
});
