import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { Drug } from './entities/drug.entity';
import { DrugEnrichment } from './entities/drug-enrichment.entity';
import { RelatedDrug } from './entities/related-drug.entity';
import { FdaService, DrugSearchResult, FDADrugResult } from '../fda/fda.service';
import { ValidationService } from '../common/services/validation.service';
import { CacheInvalidationService } from '../common/services/cache-invalidation.service';
import { EnrichmentMcpService } from '../ai/services/enrichment-mcp.service';
import { RelatedDrugsService } from '../ai/services/related-drugs.service';
import { McpToolsService } from '../ai/services/mcp-tools.service';

// Mock data
const mockDrug: Drug = {
  id: 1,
  fdaData: {
    openfda: {
      brand_name: ['Tylenol'],
      generic_name: ['acetaminophen'],
      manufacturer_name: ['Johnson & Johnson'],
      product_ndc: ['50580-608'],
    },
  },
  dataSource: 'FDA',
  ndc: '50580-608',
  brandName: 'Tylenol',
  genericName: 'acetaminophen',
  manufacturer: 'Johnson & Johnson',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFDASearchResults: DrugSearchResult[] = [
  {
    id: 'fda-123',
    brandName: 'Advil',
    genericName: 'ibuprofen',
    manufacturer: 'Pfizer',
    ndc: '12345-678',
    source: 'fda',
  },
];

describe('DrugsService', () => {
  let service: DrugsService;
  let drugRepository: jest.Mocked<Repository<Drug>>;
  let fdaService: jest.Mocked<FdaService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Drug>>;

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Drug>>;

    // Create mock repository
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    // Create mock enrichment repository
    const mockEnrichmentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    // Create mock related drug repository
    const mockRelatedDrugRepository = {
      find: jest.fn().mockResolvedValue([]), // Return empty array by default
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    // Create mock validation service
    const mockValidationService = {
      validateCreateDrug: jest.fn().mockImplementation((data) => ({ success: true, data })),
      sanitizeDrugData: jest.fn().mockImplementation((data) => data),
      validateNDC: jest.fn().mockImplementation((input) => {
        // Extract potential NDC from input for different test cases
        if (typeof input === 'string') {
          if (input.includes('50580-608')) return { success: true, data: '50580-608' };
          if (input.includes('123-456')) return { success: true, data: '123-456' };
        }
        return { success: true, data: '12345-678' };
      }),
    };

    // Create mock FDA service
    const mockFdaService = {
      searchDrugs: jest.fn(),
      getDrugByNDC: jest.fn(),
    };

    const mockEnrichmentMcpService = {
      enrichMultipleDrugs: jest.fn().mockResolvedValue({
        results: [],
        totalProcessed: 0,
        totalErrors: 0,
      }),
    };

    const mockRelatedDrugsService = {
      saveRelatedDrugs: jest.fn(),
      getRelatedDrugs: jest.fn().mockResolvedValue([]), // Return empty array by default
    };

    const mockMcpToolsService = {
      findRelatedDrugs: jest.fn(),
      findRelatedDrugsViaMCP: jest.fn().mockResolvedValue([]),
    };

    const mockCacheInvalidationService = {
      invalidateDrugCache: jest.fn(),
      generateDrugSlug: jest.fn().mockReturnValue('test-slug'),
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugsService,
        {
          provide: getRepositoryToken(Drug),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DrugEnrichment),
          useValue: mockEnrichmentRepository,
        },
        {
          provide: getRepositoryToken(RelatedDrug),
          useValue: mockRelatedDrugRepository,
        },
        {
          provide: FdaService,
          useValue: mockFdaService,
        },
        {
          provide: ValidationService,
          useValue: mockValidationService,
        },
        {
          provide: EnrichmentMcpService,
          useValue: mockEnrichmentMcpService,
        },
        {
          provide: RelatedDrugsService,
          useValue: mockRelatedDrugsService,
        },
        {
          provide: McpToolsService,
          useValue: mockMcpToolsService,
        },
        {
          provide: CacheInvalidationService,
          useValue: mockCacheInvalidationService,
        },
      ],
    }).compile();

    service = module.get<DrugsService>(DrugsService);
    drugRepository = module.get(getRepositoryToken(Drug));
    fdaService = module.get(FdaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all drugs without search filter', async () => {
      queryBuilder.getMany.mockResolvedValue([mockDrug]);

      const result = await service.findAll({});

      expect(drugRepository.createQueryBuilder).toHaveBeenCalledWith('drug');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('drug.brandName', 'ASC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(20);
      expect(queryBuilder.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual([mockDrug]);
    });

    it('should filter drugs by search term', async () => {
      queryBuilder.getMany.mockResolvedValue([mockDrug]);

      await service.findAll({ search: 'tylenol', limit: 10, offset: 5 });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'drug.brandName ILIKE :search OR drug.genericName ILIKE :search OR drug.manufacturer ILIKE :search OR drug.ndc ILIKE :search',
        { search: '%tylenol%' },
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
      expect(queryBuilder.offset).toHaveBeenCalledWith(5);
    });
  });

  describe('searchDrugs', () => {
    it('should combine local and FDA search results', async () => {
      // Mock local search
      queryBuilder.getMany.mockResolvedValue([mockDrug]);

      // Mock FDA search
      fdaService.searchDrugs.mockResolvedValue(mockFDASearchResults);

      const result = await service.searchDrugs('tylenol');

      expect(result).toHaveLength(2); // 1 local + 1 FDA result
      expect(result[0]).toEqual({
        id: '1',
        brandName: 'Tylenol',
        genericName: 'acetaminophen',
        manufacturer: 'Johnson & Johnson',
        ndc: '50580-608',
        source: 'local',
      });
      expect(result[1]).toEqual(mockFDASearchResults[0]);
    });

    it('should deduplicate results based on NDC', async () => {
      const duplicateDrug = { ...mockDrug, id: 2 };
      queryBuilder.getMany.mockResolvedValue([mockDrug, duplicateDrug]);

      fdaService.searchDrugs.mockResolvedValue([]);

      const result = await service.searchDrugs('tylenol');

      expect(result).toHaveLength(1); // Duplicates removed
    });

    it('should handle FDA service errors gracefully', async () => {
      queryBuilder.getMany.mockResolvedValue([mockDrug]);
      fdaService.searchDrugs.mockResolvedValue([]); // FDA returns empty array on error

      const result = await service.searchDrugs('tylenol');

      expect(result).toHaveLength(1); // Only local results
      expect(result[0].source).toBe('local');
    });

    it('should limit results to specified amount', async () => {
      const manyDrugs = Array(15)
        .fill(null)
        .map((_, i) => ({ ...mockDrug, id: i, ndc: `ndc-${i}` }));
      queryBuilder.getMany.mockResolvedValue(manyDrugs);
      fdaService.searchDrugs.mockResolvedValue([]);

      const result = await service.searchDrugs('test', 10);

      expect(result).toHaveLength(10);
    });
  });

  describe('findBySlug', () => {
    it('should find drug by slug (drugId)', async () => {
      drugRepository.findOne.mockResolvedValue(mockDrug);

      const result = await service.findBySlug('tylenol-50580-608');

      expect(drugRepository.findOne).toHaveBeenCalledWith({
        where: { ndc: '50580-608' },
        relations: ['enrichment', 'relatedDrugs'],
      });
      expect(result).toEqual({ ...mockDrug, slug: 'tylenol-50580-608' });
    });

    it('should throw NotFoundException when slug has invalid format', async () => {
      // Test with invalid slug format (no NDC extractable)
      await expect(service.findBySlug('invalid')).rejects.toThrow(
        new NotFoundException('Invalid slug format: "invalid". Unable to extract NDC.'),
      );
    });

    it('should call MCP workflow when no existing drug found', async () => {
      // Mock returning null for existing drug
      drugRepository.findOne.mockResolvedValue(null);

      // Mock FDA service to return data
      const mockFDAData: FDADrugResult = {
        id: 'test-fda-id',
        openfda: {
          brand_name: ['TestDrug'],
          generic_name: ['testgeneric'],
          manufacturer_name: ['Test Manufacturer'],
          product_ndc: ['123-456'],
        },
        indications_and_usage: ['Test indication'],
        warnings: ['Test warning'],
      };
      fdaService.getDrugByNDC.mockResolvedValue(mockFDAData);

      // Mock static method
      jest.spyOn(FdaService, 'transformFDAResultToDrug').mockReturnValue({
        drugId: 'testdrug-123-456',
        brandName: 'TestDrug',
        genericName: 'testgeneric',
        manufacturer: 'Test Manufacturer',
        ndc: '123-456',
        dataSource: 'FDA',
      });

      const mockCreatedDrug = { ...mockDrug, drugId: 'testdrug-123-456' };
      drugRepository.create.mockReturnValue(mockCreatedDrug as any);
      drugRepository.save.mockResolvedValue(mockCreatedDrug);

      const result = await service.findBySlug('testdrug-123-456');

      expect(fdaService.getDrugByNDC).toHaveBeenCalledWith('123-456');
      expect(drugRepository.create).toHaveBeenCalled();
      expect(drugRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ ...mockCreatedDrug, slug: 'testdrug-123-456' });
    });
  });

  describe('findOne', () => {
    it('should find drug by ID', async () => {
      drugRepository.findOne.mockResolvedValue(mockDrug);

      const result = await service.findOne('1');

      expect(drugRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['enrichment', 'relatedDrugs'],
      });
      expect(result).toEqual(mockDrug);
    });

    it('should throw NotFoundException when drug not found by ID', async () => {
      drugRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Drug with ID "999" not found'),
      );
    });
  });

  // Note: fetchAndCache method not implemented yet in service

  // Note: generateSlug method moved to FdaService.generateSlug static method

  describe('create', () => {
    it('should create and save a new drug', async () => {
      const createDrugDto = {
        drugId: 'test-drug-12345-678',
        brandName: 'Test Drug',
        ndc: '12345-678',
        genericName: 'test-generic',
        manufacturer: 'Test Manufacturer',
        dataSource: 'FDA',
      };

      drugRepository.create.mockReturnValue(mockDrug);
      drugRepository.save.mockResolvedValue(mockDrug);

      const result = await service.create(createDrugDto);

      expect(drugRepository.create).toHaveBeenCalledWith(createDrugDto);
      expect(drugRepository.save).toHaveBeenCalledWith(mockDrug);
      expect(result).toEqual(mockDrug);
    });
  });

  describe('remove', () => {
    it('should delete drug by ID', async () => {
      drugRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.remove('1');

      expect(drugRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when drug to delete not found', async () => {
      drugRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove('999')).rejects.toThrow(
        new NotFoundException('Drug with ID "999" not found'),
      );
    });
  });

  describe('Related Drugs Integration', () => {
    it('should include relatedDrugs relation in findOne queries', async () => {
      const mockDrugWithRelatedDrugs = {
        ...mockDrug,
        relatedDrugs: [
          {
            id: 1,
            name: 'Ibuprofen',
            brandName: 'Advil',
            sourceDrugId: 1,
            confidenceScore: 0.8,
            relationshipType: 'similar_indication',
            ndc: '54321-987',
            genericName: 'ibuprofen',
            manufacturer: 'Pfizer',
            indication: 'Pain relief',
            description: 'Related drug',
            metadata: {},
            sourceDrug: mockDrug,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          },
        ],
      };

      drugRepository.findOne.mockResolvedValue(mockDrugWithRelatedDrugs);

      const result = await service.findOne('1');

      expect(drugRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['enrichment', 'relatedDrugs'],
      });
      expect(result.relatedDrugs).toBeDefined();
      expect(result.relatedDrugs).toHaveLength(1);
      expect(result.relatedDrugs[0].name).toBe('Ibuprofen');
    });

    it('should include relatedDrugs relation in findBySlug queries', async () => {
      const mockDrugWithRelatedDrugs = {
        ...mockDrug,
        relatedDrugs: [
          {
            id: 1,
            name: 'Ibuprofen',
            brandName: 'Advil',
            sourceDrugId: 1,
            confidenceScore: 0.8,
            relationshipType: 'similar_indication',
            ndc: '54321-987',
            genericName: 'ibuprofen',
            manufacturer: 'Pfizer',
            indication: 'Pain relief',
            description: 'Related drug',
            metadata: {},
            sourceDrug: mockDrug,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          },
        ],
      };

      drugRepository.findOne.mockResolvedValue(mockDrugWithRelatedDrugs);

      const result = await service.findBySlug('tylenol-50580-608');

      expect(drugRepository.findOne).toHaveBeenCalledWith({
        where: { ndc: '50580-608' },
        relations: ['enrichment', 'relatedDrugs'],
      });
      expect(result.relatedDrugs).toBeDefined();
      expect(result.relatedDrugs).toHaveLength(1);
      expect(result.relatedDrugs[0].name).toBe('Ibuprofen');
    });
  });
});
