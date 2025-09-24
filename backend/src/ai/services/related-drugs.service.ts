import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RelatedDrug } from '../../drugs/entities/related-drug.entity';
import { Drug } from '../../drugs/entities/drug.entity';

export interface RelatedDrugData {
  name: string;
  ndc?: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  indication?: string;
  description?: string;
  relationshipType?: string;
  confidenceScore?: number;
  metadata?: any;
}

@Injectable()
export class RelatedDrugsService {
  private readonly logger = new Logger(RelatedDrugsService.name);

  constructor(
    @InjectRepository(RelatedDrug)
    private readonly relatedDrugRepository: Repository<RelatedDrug>,
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
  ) {}

  /**
   * Saves related drugs for a source drug
   */
  async saveRelatedDrugs(
    sourceDrugId: number,
    relatedDrugsData: RelatedDrugData[],
  ): Promise<RelatedDrug[]> {
    try {
      this.logger.debug(
        `💾 RelatedDrugsService: Starting to save ${relatedDrugsData.length} related drugs for source drug ${sourceDrugId}`,
      );

      // First, clear existing related drugs for this source drug
      await this.relatedDrugRepository.delete({ sourceDrug: { id: sourceDrugId } });
      this.logger.debug(
        `🗑️ RelatedDrugsService: Cleared existing related drugs for source drug ${sourceDrugId}`,
      );

      // Create new related drug entities
      const relatedDrugs = relatedDrugsData.map((data) => {
        const relatedDrug = new RelatedDrug();
        relatedDrug.sourceDrug = { id: sourceDrugId } as any; // Set the relation
        relatedDrug.name = data.name;
        relatedDrug.ndc = data.ndc;
        relatedDrug.brandName = data.brandName;
        relatedDrug.genericName = data.genericName;
        relatedDrug.manufacturer = data.manufacturer;
        relatedDrug.indication = data.indication;
        relatedDrug.description = data.description;
        relatedDrug.relationshipType = data.relationshipType;
        relatedDrug.confidenceScore = data.confidenceScore;
        relatedDrug.metadata = data.metadata;
        return relatedDrug;
      });

      // Save all related drugs
      const savedRelatedDrugs = await this.relatedDrugRepository.save(relatedDrugs);

      this.logger.log(
        `✅ RelatedDrugsService: Successfully saved ${savedRelatedDrugs.length} related drugs for source drug ${sourceDrugId}`,
      );

      return savedRelatedDrugs;
    } catch (error) {
      this.logger.error(
        `❌ RelatedDrugsService: Error saving related drugs for source drug ${sourceDrugId}`,
        error,
      );

      // Check if it's a duplicate key constraint error
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        this.logger.warn(
          `⚠️ RelatedDrugsService: Duplicate key constraint detected, this might be due to concurrent operations`,
        );
        // Try to fetch existing related drugs instead of throwing
        try {
          const existingRelatedDrugs = await this.relatedDrugRepository.find({
            where: { sourceDrug: { id: sourceDrugId } },
          });
          this.logger.log(
            `📋 RelatedDrugsService: Found ${existingRelatedDrugs.length} existing related drugs for source drug ${sourceDrugId}`,
          );
          return existingRelatedDrugs;
        } catch (fetchError) {
          this.logger.error(
            `❌ RelatedDrugsService: Failed to fetch existing related drugs after duplicate key error:`,
            fetchError,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Gets related drugs for a source drug
   */
  async getRelatedDrugs(sourceDrugId: number): Promise<RelatedDrug[]> {
    try {
      return await this.relatedDrugRepository.find({
        where: { sourceDrug: { id: sourceDrugId } },
        order: { confidenceScore: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching related drugs for source drug ${sourceDrugId}`, error);
      throw error;
    }
  }

  /**
   * Gets related drugs by NDC
   */
  async getRelatedDrugsByNDC(ndc: string): Promise<RelatedDrug[]> {
    try {
      return await this.relatedDrugRepository.find({
        where: { ndc },
        relations: ['sourceDrug'],
        order: { confidenceScore: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching related drugs by NDC ${ndc}`, error);
      throw error;
    }
  }

  /**
   * Gets related drugs by drug name
   */
  async getRelatedDrugsByName(name: string): Promise<RelatedDrug[]> {
    try {
      return await this.relatedDrugRepository.find({
        where: [{ name: name }, { brandName: name }, { genericName: name }],
        relations: ['sourceDrug'],
        order: { confidenceScore: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error fetching related drugs by name ${name}`, error);
      throw error;
    }
  }

  /**
   * Checks if related drugs exist for a source drug
   */
  async hasRelatedDrugs(sourceDrugId: number): Promise<boolean> {
    try {
      const count = await this.relatedDrugRepository.count({
        where: { sourceDrug: { id: sourceDrugId } },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking related drugs for source drug ${sourceDrugId}`, error);
      return false;
    }
  }

  /**
   * Deletes related drugs for a source drug
   */
  async deleteRelatedDrugs(sourceDrugId: number): Promise<void> {
    try {
      await this.relatedDrugRepository.delete({ sourceDrug: { id: sourceDrugId } });
      this.logger.log(`Deleted related drugs for source drug ${sourceDrugId}`);
    } catch (error) {
      this.logger.error(`Error deleting related drugs for source drug ${sourceDrugId}`, error);
      throw error;
    }
  }
}
