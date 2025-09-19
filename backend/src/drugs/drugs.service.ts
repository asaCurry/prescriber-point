import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';
import { FdaService, DrugSearchResult } from '../fda/fda.service';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
    private fdaService: FdaService,
  ) {}

  async create(createDrugDto: CreateDrugDto): Promise<Drug> {
    const drug = this.drugRepository.create(createDrugDto);
    return this.drugRepository.save(drug);
  }

  async findAll(options: { search?: string; limit?: number; offset?: number }): Promise<Drug[]> {
    const { search, limit = 20, offset = 0 } = options;

    const queryBuilder = this.drugRepository.createQueryBuilder('drug');

    if (search) {
      queryBuilder.where(
        'drug.name ILIKE :search OR drug.genericName ILIKE :search OR drug.manufacturer ILIKE :search OR drug.ndc ILIKE :search',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.orderBy('drug.name', 'ASC').limit(limit).offset(offset).getMany();
  }

  /**
   * Search drugs with type-ahead functionality
   * Searches both local database and FDA API
   */
  async searchDrugs(query: string, limit: number = 10): Promise<DrugSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    // Search local database first
    const localResults = await this.searchLocalDrugs(query, Math.ceil(limit / 2));

    // Search FDA API for additional results
    const fdaResults = await this.fdaService.searchDrugs(query, Math.ceil(limit / 2));

    // Combine and deduplicate results
    const combinedResults = [...localResults, ...fdaResults];
    const uniqueResults = this.deduplicateSearchResults(combinedResults);

    return uniqueResults.slice(0, limit);
  }

  /**
   * Search local database for drugs
   */
  private async searchLocalDrugs(query: string, limit: number): Promise<DrugSearchResult[]> {
    const queryBuilder = this.drugRepository.createQueryBuilder('drug');

    queryBuilder.where(
      'drug.name ILIKE :search OR drug.genericName ILIKE :search OR drug.ndc ILIKE :search',
      { search: `%${query}%` },
    );

    const drugs = await queryBuilder.orderBy('drug.name', 'ASC').limit(limit).getMany();

    return drugs.map((drug) => ({
      id: drug.id,
      brandName: drug.name,
      genericName: drug.genericName,
      manufacturer: drug.manufacturer,
      ndc: drug.ndc,
      source: 'local' as const,
    }));
  }

  /**
   * Remove duplicate search results based on NDC
   */
  private deduplicateSearchResults(results: DrugSearchResult[]): DrugSearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.ndc)) {
        return false;
      }
      seen.add(result.ndc);
      return true;
    });
  }

  async findBySlug(slug: string): Promise<Drug> {
    const drug = await this.drugRepository.findOne({ where: { slug } });
    if (!drug) {
      throw new NotFoundException(`Drug with slug "${slug}" not found`);
    }
    return drug;
  }

  async findOne(id: string): Promise<Drug> {
    const drug = await this.drugRepository.findOne({ where: { id } });
    if (!drug) {
      throw new NotFoundException(`Drug with ID "${id}" not found`);
    }
    return drug;
  }

  async update(id: string, updateDrugDto: Partial<CreateDrugDto>): Promise<Drug> {
    const drug = await this.findOne(id);
    Object.assign(drug, updateDrugDto);
    return this.drugRepository.save(drug);
  }

  async remove(id: string): Promise<void> {
    const result = await this.drugRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Drug with ID "${id}" not found`);
    }
  }
}
