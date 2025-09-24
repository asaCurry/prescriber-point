import { Test, TestingModule } from '@nestjs/testing';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';
import { DrugSearchResult } from '../fda/fda.service';

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

const mockSearchResults: DrugSearchResult[] = [
  {
    id: '1',
    brandName: 'Tylenol',
    genericName: 'acetaminophen',
    manufacturer: 'Johnson & Johnson',
    ndc: '50580-608',
    source: 'local',
  },
];

const mockDrugsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  searchDrugs: jest.fn(),
  fetchAndCacheFDADrug: jest.fn(),
  findBySlug: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DrugsController', () => {
  let controller: DrugsController;
  let service: DrugsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrugsController],
      providers: [
        {
          provide: DrugsService,
          useValue: mockDrugsService,
        },
      ],
    }).compile();

    controller = module.get<DrugsController>(DrugsController);
    service = module.get<DrugsService>(DrugsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a drug', async () => {
      const createDrugDto: CreateDrugDto = {
        drugId: 'test-drug-12345-678',
        brandName: 'Test Drug',
        ndc: '12345-678',
        genericName: 'test-generic',
        manufacturer: 'Test Manufacturer',
        dataSource: 'FDA',
      };

      mockDrugsService.create.mockResolvedValue(mockDrug);

      const result = await controller.create(createDrugDto);

      expect(service.create).toHaveBeenCalledWith(createDrugDto);
      expect(result).toEqual(mockDrug);
    });
  });

  describe('findAll', () => {
    it('should return all drugs', async () => {
      mockDrugsService.findAll.mockResolvedValue([mockDrug]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(result).toEqual([mockDrug]);
    });

    it('should return drugs with search parameters', async () => {
      mockDrugsService.findAll.mockResolvedValue([mockDrug]);

      const result = await controller.findAll('tylenol', 10, 0);

      expect(service.findAll).toHaveBeenCalledWith({
        search: 'tylenol',
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual([mockDrug]);
    });
  });

  describe('searchDrugs', () => {
    it('should perform drug search', async () => {
      mockDrugsService.searchDrugs.mockResolvedValue(mockSearchResults);

      const result = await controller.searchDrugs('tylenol', 10);

      expect(service.searchDrugs).toHaveBeenCalledWith('tylenol', 10);
      expect(result).toEqual(mockSearchResults);
    });

    it('should return empty array for short queries', async () => {
      const result = await controller.searchDrugs('ab');

      expect(result).toEqual([]);
      expect(service.searchDrugs).not.toHaveBeenCalled();
    });

    it('should use default limit when not provided', async () => {
      mockDrugsService.searchDrugs.mockResolvedValue(mockSearchResults);

      await controller.searchDrugs('tylenol');

      expect(service.searchDrugs).toHaveBeenCalledWith('tylenol', 10);
    });
  });

  describe('fetchAndCacheDrug', () => {
    it('should fetch and cache drug data', async () => {
      mockDrugsService.fetchAndCacheFDADrug.mockResolvedValue(mockDrug);

      const result = await controller.fetchAndCacheDrug('50580-608');

      expect(service.fetchAndCacheFDADrug).toHaveBeenCalledWith('50580-608', false);
      expect(result).toEqual(mockDrug);
    });

    it('should fetch and cache drug data with force refresh', async () => {
      mockDrugsService.fetchAndCacheFDADrug.mockResolvedValue(mockDrug);

      const result = await controller.fetchAndCacheDrug('50580-608', true);

      expect(service.fetchAndCacheFDADrug).toHaveBeenCalledWith('50580-608', true);
      expect(result).toEqual(mockDrug);
    });
  });

  describe('findOne', () => {
    it('should find drug by slug', async () => {
      mockDrugsService.findBySlug.mockResolvedValue(mockDrug);

      const result = await controller.findOne('tylenol-50580-608');

      expect(service.findBySlug).toHaveBeenCalledWith('tylenol-50580-608', false);
      expect(result).toEqual(mockDrug);
    });
  });

  describe('update', () => {
    it('should update drug', async () => {
      const updateDto = { genericName: 'updated-acetaminophen' };
      const updatedDrug = { ...mockDrug, ...updateDto };
      mockDrugsService.update.mockResolvedValue(updatedDrug);

      const result = await controller.update('1', updateDto);

      expect(service.update).toHaveBeenCalledWith('1', updateDto);
      expect(result).toEqual(updatedDrug);
    });
  });

  describe('remove', () => {
    it('should remove drug', async () => {
      mockDrugsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toBeUndefined();
    });
  });
});
