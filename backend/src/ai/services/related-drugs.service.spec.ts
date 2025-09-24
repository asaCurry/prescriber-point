import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RelatedDrugsService, RelatedDrugData } from './related-drugs.service';
import { RelatedDrug } from '../../drugs/entities/related-drug.entity';
import { Drug } from '../../drugs/entities/drug.entity';

const mockRelatedDrug: RelatedDrug = {
  id: 1,
  sourceDrug: { id: 1 } as Drug,
  name: 'Ibuprofen',
  brandName: 'Advil',
  genericName: 'ibuprofen',
  manufacturer: 'Pfizer',
  ndc: '54321-987',
  indication: 'Pain relief',
  description: 'Similar pain relief medication',
  relationshipType: 'similar_indication',
  confidenceScore: 0.85,
  metadata: { similarity: 'high' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRelatedDrugData: RelatedDrugData[] = [
  {
    name: 'Ibuprofen',
    brandName: 'Advil',
    genericName: 'ibuprofen',
    manufacturer: 'Pfizer',
    ndc: '54321-987',
    indication: 'Pain relief',
    description: 'Similar pain relief medication',
    relationshipType: 'similar_indication',
    confidenceScore: 0.85,
    metadata: { similarity: 'high' },
  },
];

describe('RelatedDrugsService', () => {
  let service: RelatedDrugsService;
  let relatedDrugRepository: jest.Mocked<Repository<RelatedDrug>>;

  beforeEach(async () => {
    const mockRelatedDrugRepository = {
      delete: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockDrugRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatedDrugsService,
        {
          provide: getRepositoryToken(RelatedDrug),
          useValue: mockRelatedDrugRepository,
        },
        {
          provide: getRepositoryToken(Drug),
          useValue: mockDrugRepository,
        },
      ],
    }).compile();

    service = module.get<RelatedDrugsService>(RelatedDrugsService);
    relatedDrugRepository = module.get(getRepositoryToken(RelatedDrug));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveRelatedDrugs', () => {
    it('should save related drugs for a source drug', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.delete.mockResolvedValue({ affected: 0, raw: {} });
      relatedDrugRepository.save.mockResolvedValue([mockRelatedDrug] as any);

      const result = await service.saveRelatedDrugs(sourceDrugId, mockRelatedDrugData);

      expect(relatedDrugRepository.delete).toHaveBeenCalledWith({
        sourceDrug: { id: sourceDrugId },
      });
      expect(relatedDrugRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sourceDrug: { id: sourceDrugId },
            name: 'Ibuprofen',
            brandName: 'Advil',
            genericName: 'ibuprofen',
            ndc: '54321-987',
          }),
        ]),
      );
      expect(result).toEqual([mockRelatedDrug]);
    });

    it('should clear existing related drugs before saving new ones', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.delete.mockResolvedValue({ affected: 2, raw: {} });
      relatedDrugRepository.save.mockResolvedValue([mockRelatedDrug] as any);

      await service.saveRelatedDrugs(sourceDrugId, mockRelatedDrugData);

      expect(relatedDrugRepository.delete).toHaveBeenCalledWith({
        sourceDrug: { id: sourceDrugId },
      });
      expect(relatedDrugRepository.save).toHaveBeenCalled();
    });

    it('should handle errors during save operation', async () => {
      const sourceDrugId = 1;
      const error = new Error('Database error');
      relatedDrugRepository.delete.mockResolvedValue({ affected: 0, raw: {} });
      relatedDrugRepository.save.mockRejectedValue(error);

      await expect(service.saveRelatedDrugs(sourceDrugId, mockRelatedDrugData)).rejects.toThrow(
        error,
      );
    });

    it('should save empty array of related drugs', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.delete.mockResolvedValue({ affected: 0, raw: {} });
      relatedDrugRepository.save.mockResolvedValue([] as any);

      const result = await service.saveRelatedDrugs(sourceDrugId, []);

      expect(relatedDrugRepository.delete).toHaveBeenCalledWith({
        sourceDrug: { id: sourceDrugId },
      });
      expect(relatedDrugRepository.save).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });

  describe('getRelatedDrugs', () => {
    it('should get related drugs for a source drug', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.find.mockResolvedValue([mockRelatedDrug]);

      const result = await service.getRelatedDrugs(sourceDrugId);

      expect(relatedDrugRepository.find).toHaveBeenCalledWith({
        where: { sourceDrug: { id: sourceDrugId } },
        order: { confidenceScore: 'DESC' },
      });
      expect(result).toEqual([mockRelatedDrug]);
    });

    it('should return empty array when no related drugs found', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.find.mockResolvedValue([]);

      const result = await service.getRelatedDrugs(sourceDrugId);

      expect(result).toEqual([]);
    });

    it('should handle errors during get operation', async () => {
      const sourceDrugId = 1;
      const error = new Error('Database error');
      relatedDrugRepository.find.mockRejectedValue(error);

      await expect(service.getRelatedDrugs(sourceDrugId)).rejects.toThrow(error);
    });
  });

  describe('getRelatedDrugsByNDC', () => {
    it('should get related drugs by NDC', async () => {
      const ndc = '54321-987';
      const mockRelatedDrugWithSource = { ...mockRelatedDrug, sourceDrug: {} as Drug };
      relatedDrugRepository.find.mockResolvedValue([mockRelatedDrugWithSource]);

      const result = await service.getRelatedDrugsByNDC(ndc);

      expect(relatedDrugRepository.find).toHaveBeenCalledWith({
        where: { ndc },
        relations: ['sourceDrug'],
        order: { confidenceScore: 'DESC' },
      });
      expect(result).toEqual([mockRelatedDrugWithSource]);
    });

    it('should handle errors during NDC lookup', async () => {
      const ndc = '54321-987';
      const error = new Error('Database error');
      relatedDrugRepository.find.mockRejectedValue(error);

      await expect(service.getRelatedDrugsByNDC(ndc)).rejects.toThrow(error);
    });
  });

  describe('getRelatedDrugsByName', () => {
    it('should get related drugs by name', async () => {
      const name = 'Ibuprofen';
      const mockRelatedDrugWithSource = { ...mockRelatedDrug, sourceDrug: {} as Drug };
      relatedDrugRepository.find.mockResolvedValue([mockRelatedDrugWithSource]);

      const result = await service.getRelatedDrugsByName(name);

      expect(relatedDrugRepository.find).toHaveBeenCalledWith({
        where: [{ name }, { brandName: name }, { genericName: name }],
        relations: ['sourceDrug'],
        order: { confidenceScore: 'DESC' },
      });
      expect(result).toEqual([mockRelatedDrugWithSource]);
    });

    it('should handle errors during name lookup', async () => {
      const name = 'Ibuprofen';
      const error = new Error('Database error');
      relatedDrugRepository.find.mockRejectedValue(error);

      await expect(service.getRelatedDrugsByName(name)).rejects.toThrow(error);
    });
  });

  describe('hasRelatedDrugs', () => {
    it('should return true when related drugs exist', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.count.mockResolvedValue(3);

      const result = await service.hasRelatedDrugs(sourceDrugId);

      expect(relatedDrugRepository.count).toHaveBeenCalledWith({
        where: { sourceDrug: { id: sourceDrugId } },
      });
      expect(result).toBe(true);
    });

    it('should return false when no related drugs exist', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.count.mockResolvedValue(0);

      const result = await service.hasRelatedDrugs(sourceDrugId);

      expect(result).toBe(false);
    });

    it('should return false when an error occurs', async () => {
      const sourceDrugId = 1;
      const error = new Error('Database error');
      relatedDrugRepository.count.mockRejectedValue(error);

      const result = await service.hasRelatedDrugs(sourceDrugId);

      expect(result).toBe(false);
    });
  });

  describe('deleteRelatedDrugs', () => {
    it('should delete related drugs for a source drug', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.delete.mockResolvedValue({ affected: 3, raw: {} });

      await service.deleteRelatedDrugs(sourceDrugId);

      expect(relatedDrugRepository.delete).toHaveBeenCalledWith({
        sourceDrug: { id: sourceDrugId },
      });
    });

    it('should handle errors during delete operation', async () => {
      const sourceDrugId = 1;
      const error = new Error('Database error');
      relatedDrugRepository.delete.mockRejectedValue(error);

      await expect(service.deleteRelatedDrugs(sourceDrugId)).rejects.toThrow(error);
    });

    it('should succeed even when no records are deleted', async () => {
      const sourceDrugId = 1;
      relatedDrugRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.deleteRelatedDrugs(sourceDrugId)).resolves.toBeUndefined();
    });
  });
});
