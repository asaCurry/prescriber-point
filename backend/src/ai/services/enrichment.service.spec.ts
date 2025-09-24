import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EnrichmentService } from './enrichment.service';
import { AIService } from '../ai.service';
import { FdaService } from '../../fda/fda.service';
import { DrugsService } from '../../drugs/drugs.service';
import { IdentifierValidationService } from './identifier-validation.service';
import { RelatedDrugsService } from './related-drugs.service';
import { Drug } from '../../drugs/entities/drug.entity';
import { DrugEnrichment } from '../../drugs/entities/drug-enrichment.entity';
import { IdentifierType } from '../dto/enrichment-request.dto';

const mockAIService = {
  enrichDrugData: jest.fn(),
};

const mockFdaService = {
  getDrugByNDC: jest.fn(),
  searchDrugs: jest.fn(),
};

const mockDrugsService = {
  searchDrugs: jest.fn(),
};

const mockValidationService = {
  validateIdentifiers: jest.fn(),
};

const mockRelatedDrugsService = {
  saveRelatedDrugs: jest.fn(),
  getRelatedDrugs: jest.fn(),
};

const mockDrugRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockEnrichmentRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('EnrichmentService', () => {
  let service: EnrichmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrichmentService,
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: FdaService,
          useValue: mockFdaService,
        },
        {
          provide: DrugsService,
          useValue: mockDrugsService,
        },
        {
          provide: IdentifierValidationService,
          useValue: mockValidationService,
        },
        {
          provide: RelatedDrugsService,
          useValue: mockRelatedDrugsService,
        },
        {
          provide: getRepositoryToken(Drug),
          useValue: mockDrugRepository,
        },
        {
          provide: getRepositoryToken(DrugEnrichment),
          useValue: mockEnrichmentRepository,
        },
      ],
    }).compile();

    service = module.get<EnrichmentService>(EnrichmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichMultipleDrugs', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service.enrichMultipleDrugs).toBeDefined();
    });

    it('should process request without validation', async () => {
      const request = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
        validateIdentifiers: false,
      };

      // Mock FDA service to return data
      mockFdaService.getDrugByNDC.mockResolvedValue({
        openfda: {
          brand_name: ['Test Drug'],
          generic_name: ['test-generic'],
        },
      });

      // Mock AI service
      mockAIService.enrichDrugData.mockResolvedValue({
        title: 'Test Drug - Information',
        metaDescription: 'Test description',
        slug: 'test-drug',
        summary: 'Test summary',
        aiGeneratedFaqs: [],
        relatedDrugs: [],
        relatedConditions: [],
        keywords: ['test'],
        structuredData: {},
        confidenceScore: 0.8,
      });

      const result = await service.enrichMultipleDrugs(request);

      expect(result.requestId).toBeDefined();
      expect(result.totalRequested).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('success');
    });

    it('should handle validation errors', async () => {
      const request = {
        identifiers: [{ type: IdentifierType.NDC, value: 'invalid-ndc' }],
        validateIdentifiers: true,
      };

      mockValidationService.validateIdentifiers.mockResolvedValue({
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
      });

      const result = await service.enrichMultipleDrugs(request);

      expect(result.totalRequested).toBe(1);
      expect(result.totalProcessed).toBe(0);
      expect(result.validationResult.errorCount).toBe(1);
    });

    it('should handle FDA API errors gracefully', async () => {
      const request = {
        identifiers: [{ type: IdentifierType.NDC, value: '12345-678-90' }],
        validateIdentifiers: false,
      };

      mockFdaService.getDrugByNDC.mockResolvedValue(null);

      const result = await service.enrichMultipleDrugs(request);

      expect(result.results[0].status).toBe('error');
      expect(result.results[0].error?.type).toBe('AIServiceException');
    });
  });
});
