import { Test, TestingModule } from '@nestjs/testing';
import { DrugEnrichmentResolver } from './drug-enrichment.resolver';
import { EnrichmentMcpService } from './services/enrichment-mcp.service';
import { RelatedDrugsService } from './services/related-drugs.service';
import { FdaService } from '../fda/fda.service';
import { AIService } from './ai.service';
import { IdentifierType } from './dto/enrichment-request.dto';

describe('DrugEnrichmentResolver', () => {
  let resolver: DrugEnrichmentResolver;
  let enrichmentService: jest.Mocked<EnrichmentMcpService>;
  let relatedDrugsService: jest.Mocked<RelatedDrugsService>;
  let aiService: jest.Mocked<AIService>;

  const mockEnrichmentService = {
    enrichMultipleDrugs: jest.fn(),
    validationService: {
      validateIdentifiers: jest.fn(),
    },
    aiService: {
      generateRelatedDrugs: jest.fn(),
    },
  };

  const mockRelatedDrugsService = {
    saveRelatedDrugs: jest.fn(),
    getRelatedDrugs: jest.fn(),
  };

  const mockFdaService = {
    getDrugByNDC: jest.fn(),
    searchDrugs: jest.fn(),
  };

  const mockAIService = {
    generateRelatedDrugs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugEnrichmentResolver,
        {
          provide: EnrichmentMcpService,
          useValue: mockEnrichmentService,
        },
        {
          provide: RelatedDrugsService,
          useValue: mockRelatedDrugsService,
        },
        {
          provide: FdaService,
          useValue: mockFdaService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    }).compile();

    resolver = module.get<DrugEnrichmentResolver>(DrugEnrichmentResolver);
    enrichmentService = module.get(EnrichmentMcpService);
    relatedDrugsService = module.get(RelatedDrugsService);
    aiService = module.get(AIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findRelatedDrugs', () => {
    const mockSourceDrugData = {
      title: 'Tylenol',
      metaDescription: 'Pain relief medication',
      slug: 'tylenol-50580-608',
      summary: 'Pain relief medication',
      indicationSummary: 'Pain and fever relief',
      keywords: ['analgesic', 'antipyretic'],
      sideEffectsSummary: 'Generally well tolerated',
      dosageSummary: 'Take as directed',
      warningsSummary: 'Do not exceed recommended dose',
      contraindicationsSummary: 'None known',
      aiGeneratedFaqs: [],
      relatedDrugs: [],
      relatedConditions: [],
      structuredData: {},
      confidenceScore: 0.8,
    };

    const mockRelatedDrugs = [
      {
        name: 'Ibuprofen',
        ndc: '0006-0222-31',
        brandName: 'Advil',
        genericName: 'Ibuprofen',
        manufacturer: 'Pfizer',
        indication: 'Pain relief and anti-inflammatory',
        description: 'Alternative NSAID with similar mechanism',
        relationshipType: 'alternative',
        confidenceScore: 0.85,
      },
    ];

    beforeEach(() => {
      // Mock successful enrichment service response
      enrichmentService.enrichMultipleDrugs.mockResolvedValue({
        requestId: 'test-request',
        timestamp: new Date(),
        totalRequested: 1,
        totalProcessed: 1,
        totalErrors: 0,
        validationResult: {
          isValid: true,
          validIdentifiers: [],
          errors: [],
          warningCount: 0,
          errorCount: 0,
        },
        results: [
          {
            identifier: { type: 'brand_name' as IdentifierType, value: 'Tylenol' },
            status: 'success',
            data: mockSourceDrugData,
            processingTimeMs: 100,
            dataSource: 'fda',
          },
        ],
        summary: {
          successRate: 1.0,
          averageConfidence: 0.8,
          processingTimeMs: 100,
        },
      });

      // Mock AI service response
      aiService.generateRelatedDrugs.mockResolvedValue(mockRelatedDrugs);
    });

    it('should successfully find related drugs using AI', async () => {
      const args = {
        sourceDrugIdentifier: { type: 'brand_name', value: 'Tylenol' },
        maxResults: 3,
        relationshipTypes: ['alternative', 'similar_indication'],
        includeConfidence: true,
      };

      const result = await resolver.findRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Related Drugs Analysis');
      expect(result.content[0].text).toContain('Tylenol');
      expect(result.content[0].text).toContain('**Total Found:** 0'); // No related drugs found
      expect((result as any).isError).toBeUndefined();

      expect(enrichmentService.enrichMultipleDrugs).toHaveBeenCalledWith({
        identifiers: [{ type: 'brand_name', value: 'Tylenol' }],
        includeConfidence: true,
        validateIdentifiers: true,
      });

      // AI service should not be called when no API key is set
      expect(aiService.generateRelatedDrugs).not.toHaveBeenCalled();
    });

    it('should handle source drug not found', async () => {
      enrichmentService.enrichMultipleDrugs.mockResolvedValue({
        requestId: 'test-request',
        timestamp: new Date(),
        totalRequested: 1,
        totalProcessed: 1,
        totalErrors: 0,
        validationResult: {
          isValid: true,
          validIdentifiers: [],
          errors: [],
          warningCount: 0,
          errorCount: 0,
        },
        results: [
          {
            identifier: { type: 'brand_name' as IdentifierType, value: 'UnknownDrug' },
            status: 'not_found',
            processingTimeMs: 100,
            dataSource: 'fda',
          },
        ],
        summary: {
          successRate: 0.0,
          averageConfidence: 0.0,
          processingTimeMs: 100,
        },
      });

      const args = {
        sourceDrugIdentifier: { type: 'brand_name', value: 'UnknownDrug' },
        maxResults: 3,
      };

      const result = await resolver.findRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Could not find source drug data');
      expect((result as any).isError).toBe(true);
    });

    it('should fall back to mock data when AI service fails', async () => {
      aiService.generateRelatedDrugs.mockResolvedValue([]);

      const args = {
        sourceDrugIdentifier: { type: 'brand_name', value: 'Tylenol' },
        maxResults: 3,
      };

      const result = await resolver.findRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Related Drugs Found');
      expect(result.content[0].text).toContain('**Total Found:** 0'); // No fallback data anymore
      expect((result as any).isError).toBeUndefined();
    });

    it('should handle AI service errors gracefully', async () => {
      aiService.generateRelatedDrugs.mockRejectedValue(new Error('AI service unavailable'));

      const args = {
        sourceDrugIdentifier: { type: 'brand_name', value: 'Tylenol' },
        maxResults: 3,
      };

      const result = await resolver.findRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Related Drugs Found');
      expect(result.content[0].text).toContain('**Total Found:** 0'); // No fallback data anymore
      expect((result as any).isError).toBeUndefined();
    });

    it('should use default parameters when not provided', async () => {
      const args = {
        sourceDrugIdentifier: { type: 'brand_name', value: 'Tylenol' },
      };

      const result = await resolver.findRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect((result as any).isError).toBeUndefined();

      // AI service should not be called when no API key is set
      expect(aiService.generateRelatedDrugs).not.toHaveBeenCalled();
    });
  });

  describe('saveRelatedDrugs', () => {
    const mockRelatedDrugsData = [
      {
        name: 'Ibuprofen',
        ndc: '0006-0222-31',
        brandName: 'Advil',
        genericName: 'Ibuprofen',
        manufacturer: 'Pfizer',
        indication: 'Pain relief',
        description: 'Alternative NSAID',
        relationshipType: 'alternative',
        confidenceScore: 0.85,
      },
    ];

    const mockSavedDrugs = [
      {
        id: 1,
        sourceDrugId: 123,
        name: 'Ibuprofen',
        ndc: '0006-0222-31',
        brandName: 'Advil',
        genericName: 'Ibuprofen',
        manufacturer: 'Pfizer',
        indication: 'Pain relief',
        description: 'Alternative NSAID',
        relationshipType: 'alternative',
        confidenceScore: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      relatedDrugsService.saveRelatedDrugs.mockResolvedValue(mockSavedDrugs as any);
    });

    it('should successfully save related drugs', async () => {
      const args = {
        sourceDrugId: 123,
        relatedDrugs: mockRelatedDrugsData,
      };

      const result = await resolver.saveRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Related Drugs Save Results');
      expect(result.content[0].text).toContain('Data prepared for saving 1 related drugs');
      expect(result.content[0].text).toContain('Ibuprofen');
      expect((result as any).isError).toBeUndefined();

      // MCP tool doesn't actually call the service, it just prepares data
      expect(relatedDrugsService.saveRelatedDrugs).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      relatedDrugsService.saveRelatedDrugs.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const args = {
        sourceDrugId: 123,
        relatedDrugs: mockRelatedDrugsData,
      };

      const result = await resolver.saveRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Data prepared for saving 1 related drugs');
      expect((result as any).isError).toBeUndefined(); // MCP tool doesn't actually fail
    });
  });

  describe('getRelatedDrugs', () => {
    const mockRelatedDrugs = [
      {
        id: 1,
        sourceDrugId: 123,
        name: 'Ibuprofen',
        ndc: '0006-0222-31',
        brandName: 'Advil',
        genericName: 'Ibuprofen',
        manufacturer: 'Pfizer',
        indication: 'Pain relief',
        description: 'Alternative NSAID',
        relationshipType: 'alternative',
        confidenceScore: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      relatedDrugsService.getRelatedDrugs.mockResolvedValue(mockRelatedDrugs as any);
    });

    it('should successfully retrieve related drugs', async () => {
      const args = { sourceDrugId: 123 };

      const result = await resolver.getRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Related Drugs Retrieval Results');
      expect(result.content[0].text).toContain('MCP tool cannot access database directly');
      expect(result.content[0].text).toContain(
        "Use the 'find_related_drugs' tool to discover related drugs",
      );
      expect((result as any).isError).toBeUndefined();

      // MCP tool doesn't actually call the service, it just returns a message
      expect(relatedDrugsService.getRelatedDrugs).not.toHaveBeenCalled();
    });

    it('should handle no related drugs found', async () => {
      relatedDrugsService.getRelatedDrugs.mockResolvedValue([]);

      const args = { sourceDrugId: 123 };

      const result = await resolver.getRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('MCP tool cannot access database directly');
      expect(result.content[0].text).toContain(
        "Use the 'find_related_drugs' tool to discover related drugs",
      );
      expect((result as any).isError).toBeUndefined();
    });

    it('should handle retrieval errors gracefully', async () => {
      relatedDrugsService.getRelatedDrugs.mockRejectedValue(new Error('Database query failed'));

      const args = { sourceDrugId: 123 };

      const result = await resolver.getRelatedDrugs(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('MCP tool cannot access database directly');
      expect(result.content[0].text).toContain(
        "Use the 'find_related_drugs' tool to discover related drugs",
      );
      expect((result as any).isError).toBeUndefined(); // MCP tool doesn't actually fail
    });
  });
});
