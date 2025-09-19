import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
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
        'drug.name ILIKE :search OR drug.genericName ILIKE :search OR drug.manufacturer ILIKE :search',
        { search: `%${search}%` }
      );
    }
    
    return queryBuilder
      .orderBy('drug.name', 'ASC')
      .limit(limit)
      .offset(offset)
      .getMany();
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