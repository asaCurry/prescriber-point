import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';
import { DrugEnrichment } from './entities/drug-enrichment.entity';
import { RelatedDrug } from './entities/related-drug.entity';
import { FdaService, DrugSearchResult } from '../fda/fda.service';
import { ValidationService } from '../common/services/validation.service';
import { EnrichmentMcpService } from '../ai/services/enrichment-mcp.service';
import { RelatedDrugsService } from '../ai/services/related-drugs.service';
import { McpToolsService } from '../ai/services/mcp-tools.service';
import { IdentifierType } from '../ai/dto/enrichment-request.dto';

@Injectable()
export class DrugsService {
  private readonly logger = new Logger(DrugsService.name);

  // Cache for drug slugs with TTL (Time To Live)
  private drugSlugsCache: { data: string[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Cache expiration settings
  private readonly ENRICHMENT_CACHE_TTL_HOURS = 24 * 7; // 7 days
  private readonly DATA_CACHE_TTL_HOURS = 24; // 1 day

  // Lock for preventing concurrent related drugs generation
  private relatedDrugsGenerationLocks = new Set<number>();

  // Lock for preventing concurrent enrichment generation
  private enrichmentGenerationLocks = new Set<number>();

  // Cache for individual drugs to avoid redundant queries
  private drugCache = new Map<string, Drug & { slug: string }>();
  private readonly DRUG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Drug)
    private drugRepository: Repository<Drug>,
    @InjectRepository(DrugEnrichment)
    private enrichmentRepository: Repository<DrugEnrichment>,
    @InjectRepository(RelatedDrug)
    private relatedDrugRepository: Repository<RelatedDrug>,
    private fdaService: FdaService,
    private validationService: ValidationService,
    @Inject(forwardRef(() => EnrichmentMcpService))
    private enrichmentMcpService: EnrichmentMcpService,
    @Inject(forwardRef(() => RelatedDrugsService))
    private relatedDrugsService: RelatedDrugsService,
    @Inject(forwardRef(() => McpToolsService))
    private mcpToolsService: McpToolsService,
  ) {}

  async create(createDrugDto: CreateDrugDto): Promise<Drug> {
    // Enhanced validation using our validation service
    const validation = this.validationService.validateCreateDrug(createDrugDto);

    if (!validation.success) {
      throw new BadRequestException(`Invalid drug data: ${validation.errors?.join(', ')}`);
    }

    // Log warnings if any
    if (validation.warnings?.length) {
      this.logger.warn(`Drug creation warnings: ${validation.warnings.join(', ')}`);
    }

    // Sanitize data for consistency
    const sanitizedData = this.validationService.sanitizeDrugData(validation.data!);

    const drug = this.drugRepository.create(sanitizedData);
    const savedDrug = await this.drugRepository.save(drug);

    // Invalidate cache when new drug is added
    this.invalidateDrugSlugsCache();

    return savedDrug;
  }

  async findAll(options: { search?: string; limit?: number; offset?: number }): Promise<Drug[]> {
    const { search, limit = 20, offset = 0 } = options;

    const queryBuilder = this.drugRepository
      .createQueryBuilder('drug')
      .leftJoinAndSelect('drug.enrichment', 'enrichment')
      .leftJoinAndSelect('drug.relatedDrugs', 'relatedDrugs');

    if (search) {
      queryBuilder.where(
        'drug.brandName ILIKE :search OR drug.genericName ILIKE :search OR drug.manufacturer ILIKE :search OR drug.ndc ILIKE :search',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.orderBy('drug.brandName', 'ASC').limit(limit).offset(offset).getMany();
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
      'drug.brandName ILIKE :search OR drug.genericName ILIKE :search OR drug.ndc ILIKE :search',
      { search: `%${query}%` },
    );

    const drugs = await queryBuilder.orderBy('drug.brandName', 'ASC').limit(limit).getMany();

    return drugs.map((drug) => ({
      id: drug.id.toString(),
      brandName: drug.brandName,
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

  async findBySlug(
    slug: string,
    waitForEnrichment: boolean = false,
  ): Promise<Drug & { slug: string }> {
    this.logger.debug(`🔍 Finding drug by slug: ${slug} (waitForEnrichment: ${waitForEnrichment})`);

    // Check in-memory cache first (fastest)
    const cachedDrug = this.drugCache.get(slug);
    if (cachedDrug) {
      this.logger.debug(`⚡ Returning cached drug for slug: ${slug}`);
      return cachedDrug;
    }

    // Parse NDC from slug (format: brand-name-ndc)
    const ndc = this.extractNDCFromSlug(slug);
    if (!ndc) {
      throw new NotFoundException(`Invalid slug format: "${slug}". Unable to extract NDC.`);
    }

    // Single database query with all relations
    const drugWithRelations = await this.drugRepository.findOne({
      where: { ndc: ndc },
      relations: ['enrichment', 'relatedDrugs'],
    });

    // Debug logging
    this.logger.debug(`🔍 Drug query result for NDC ${ndc}:`, {
      found: !!drugWithRelations,
      id: drugWithRelations?.id,
      hasEnrichment: !!drugWithRelations?.enrichment,
      hasRelatedDrugs: !!drugWithRelations?.relatedDrugs,
      relatedDrugsCount: drugWithRelations?.relatedDrugs?.length || 0,
    });

    if (drugWithRelations) {
      // Check if data is fresh
      const enrichmentIsFresh = this.isEnrichmentFresh(drugWithRelations.enrichment);
      const dataIsFresh = this.isDataFresh(drugWithRelations.updatedAt);

      if (enrichmentIsFresh && dataIsFresh) {
        this.logger.debug(`✅ Returning fresh cached data for slug: ${slug}`);

        // Ensure related drugs are loaded
        if (!drugWithRelations.relatedDrugs || drugWithRelations.relatedDrugs.length === 0) {
          this.logger.debug(`🔄 Loading related drugs for cached drug ID ${drugWithRelations.id}`);
          drugWithRelations.relatedDrugs = await this.getRelatedDrugs(drugWithRelations.id);
        }

        const result = { ...drugWithRelations, slug: slug };

        // Cache the result
        this.drugCache.set(slug, result);

        // Trigger related drugs generation in background if needed
        this.triggerRelatedDrugsGenerationIfNeeded(drugWithRelations);

        return result;
      }

      this.logger.debug(`🔄 Data is stale for slug: ${slug}. Refreshing in background...`);

      // Ensure related drugs are loaded even for stale data
      if (!drugWithRelations.relatedDrugs || drugWithRelations.relatedDrugs.length === 0) {
        this.logger.debug(`🔄 Loading related drugs for stale drug ID ${drugWithRelations.id}`);
        drugWithRelations.relatedDrugs = await this.getRelatedDrugs(drugWithRelations.id);
      }

      // Return existing data while refresh happens in background
      const result = { ...drugWithRelations, slug: slug };
      this.drugCache.set(slug, result);

      // Trigger background refresh
      this.refreshDrugDataInBackground(ndc, drugWithRelations);

      return result;
    }

    // No existing data, fetch and create new drug
    this.logger.debug(`🆕 No cached data found for slug: ${slug}. Creating new drug...`);
    return this.createNewDrugFromNDC(ndc, slug, waitForEnrichment);
  }

  async findOne(id: string): Promise<Drug> {
    const drug = await this.drugRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['enrichment', 'relatedDrugs'],
    });
    if (!drug) {
      throw new NotFoundException(`Drug with ID "${id}" not found`);
    }
    return drug;
  }

  /**
   * Find drug by NDC
   */
  async findByNDC(ndc: string): Promise<Drug | null> {
    return await this.drugRepository.findOne({
      where: { ndc },
      relations: ['enrichment', 'relatedDrugs'],
    });
  }

  /**
   * Find drug by brand name
   */
  async findByBrandName(brandName: string): Promise<Drug | null> {
    return await this.drugRepository.findOne({
      where: { brandName },
      relations: ['enrichment', 'relatedDrugs'],
    });
  }

  /**
   * Find drug by generic name
   */
  async findByGenericName(genericName: string): Promise<Drug | null> {
    return await this.drugRepository.findOne({
      where: { genericName },
      relations: ['enrichment', 'relatedDrugs'],
    });
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

  /**
   * Fetch FDA data by NDC and cache it to the database
   */
  async fetchAndCacheFDADrug(ndc: string, forceRefresh: boolean = false): Promise<Drug> {
    // Validate NDC format using FDA service validator
    if (!ndc || !FdaService.isValidNDCFormat(ndc)) {
      throw new NotFoundException(
        `Invalid NDC format: "${ndc}". Expected format with digits and dashes (e.g., 12345-678 or 1234-567-89)`,
      );
    }

    this.logger.debug(`Fetching and caching FDA drug for NDC: ${ndc}`);

    // First check if drug already exists (unless forcing refresh)
    const existingDrug = await this.drugRepository.findOne({
      where: { ndc },
    });

    if (existingDrug && !forceRefresh) {
      this.logger.debug(`Drug with NDC ${ndc} already exists in database`);
      return existingDrug;
    }

    try {
      // Fetch from FDA API
      const fdaData = await this.fdaService.getDrugByNDC(ndc);
      if (!fdaData) {
        throw new NotFoundException(`Drug with NDC "${ndc}" not found in FDA database`);
      }

      // Transform FDA data using static method
      const drugData = FdaService.transformFDAResultToDrug(fdaData);
      if (!drugData) {
        throw new NotFoundException(`Drug with NDC "${ndc}" has insufficient data for processing`);
      }

      this.logger.debug(`Successfully transformed FDA data for drug: ${drugData.brandName}`);

      // Save to database (or update existing if force refresh)
      let savedDrug: Drug;
      if (existingDrug && forceRefresh) {
        // Update existing drug with new data
        Object.assign(existingDrug, drugData);
        savedDrug = await this.drugRepository.save(existingDrug);
        this.logger.debug(`Updated existing drug ${savedDrug.brandName} with ID: ${savedDrug.id}`);
      } else {
        // Create new drug
        const drug = this.drugRepository.create(drugData);
        savedDrug = await this.drugRepository.save(drug);
        this.logger.debug(
          `Successfully cached new drug ${savedDrug.brandName} with ID: ${savedDrug.id}`,
        );
      }

      this.logger.debug(`Successfully cached drug ${savedDrug.brandName} with ID: ${savedDrug.id}`);

      // Trigger AI enrichment via MCP service
      this.triggerEnrichmentViaMCP(savedDrug).catch((error) => {
        this.logger.error(`Enrichment failed for drug ${savedDrug.id}:`, error);
      });

      // Invalidate cache when drug data is updated/added
      this.invalidateDrugSlugsCache();

      return savedDrug;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch and cache drug with NDC "${ndc}"`, {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to fetch and cache drug with NDC "${ndc}": ${error.message}`);
    }
  }

  /**
   * Check if enrichment data is fresh (within cache TTL)
   */
  private isEnrichmentFresh(enrichment?: DrugEnrichment): boolean {
    if (!enrichment) return false;

    const cacheExpiryTime = new Date(
      enrichment.updatedAt.getTime() + this.ENRICHMENT_CACHE_TTL_HOURS * 60 * 60 * 1000,
    );

    return new Date() < cacheExpiryTime;
  }

  /**
   * Check if drug data is fresh (within cache TTL)
   */
  private isDataFresh(updatedAt: Date): boolean {
    const cacheExpiryTime = new Date(
      updatedAt.getTime() + this.DATA_CACHE_TTL_HOURS * 60 * 60 * 1000,
    );

    return new Date() < cacheExpiryTime;
  }

  /**
   * Extract NDC from slug format: brand-name-ndc with enhanced validation
   */
  private extractNDCFromSlug(slug: string): string | null {
    // Slug format: brand-name-with-hyphens-ndcpart1-ndcpart2
    // NDC is typically the last 2 parts separated by hyphens
    const parts = slug.split('-');
    if (parts.length < 2) return null;

    // Take the last 2 parts and join them for NDC
    const ndcParts = parts.slice(-2);
    const potentialNDC = ndcParts.join('-');

    // Validate the extracted NDC using our schema
    const validation = this.validationService.validateNDC(potentialNDC);
    if (validation.success) {
      return validation.data;
    }

    // If 2-part NDC doesn't work, try 3-part NDC
    if (parts.length >= 3) {
      const threeParts = parts.slice(-3);
      const threePartNDC = threeParts.join('-');
      const threePartValidation = this.validationService.validateNDC(threePartNDC);
      if (threePartValidation.success) {
        return threePartValidation.data;
      }
    }

    this.logger.debug(`Failed to extract valid NDC from slug: ${slug}`);
    return null;
  }

  /**
   * Helper method to trigger related drugs generation if needed
   */
  private triggerRelatedDrugsGenerationIfNeeded(drug: Drug): void {
    if (!drug.relatedDrugs || drug.relatedDrugs.length === 0) {
      this.triggerRelatedDrugsGenerationViaMCP(drug).catch((error) => {
        this.logger.error(`Background related drugs generation failed for drug ${drug.id}:`, error);
      });
    }
  }

  /**
   * Helper method to refresh drug data in background
   */
  private refreshDrugDataInBackground(ndc: string, existingDrug: Drug): void {
    this.refreshDrugDataViaMCP(ndc, existingDrug).catch((error) => {
      this.logger.error(`Background refresh failed for NDC ${ndc}:`, error);
    });
  }

  /**
   * Create new drug from NDC (optimized for seed data)
   */
  private async createNewDrugFromNDC(
    ndc: string,
    slug: string,
    waitForEnrichment: boolean = false,
  ): Promise<Drug & { slug: string }> {
    try {
      this.logger.debug(
        `🆕 Creating new drug from NDC: ${ndc} (waitForEnrichment: ${waitForEnrichment})`,
      );

      // Single FDA API call
      const fdaData = await this.fdaService.getDrugByNDC(ndc);
      if (!fdaData) {
        throw new NotFoundException(`Drug with NDC "${ndc}" not found`);
      }

      // Transform FDA data to drug entity
      const drugData = FdaService.transformFDAResultToDrug(fdaData);
      if (!drugData) {
        throw new NotFoundException(`Drug with NDC "${ndc}" has insufficient data`);
      }

      // Create and save drug
      const drug = this.drugRepository.create(drugData);
      const savedDrug = await this.drugRepository.save(drug);

      // Cache the result
      const result = { ...savedDrug, slug: slug };
      this.drugCache.set(slug, result);

      if (waitForEnrichment) {
        this.logger.debug(`⏳ Waiting for enrichment to complete for drug: ${savedDrug.brandName}`);
        // Wait for enrichment to complete
        await this.triggerEnrichmentViaMCPSync(savedDrug);

        // Refresh the drug with enrichment data
        const enrichedDrug = await this.drugRepository.findOne({
          where: { id: savedDrug.id },
          relations: ['enrichment', 'relatedDrugs'],
        });

        if (enrichedDrug) {
          const enrichedResult = { ...enrichedDrug, slug: slug };
          this.drugCache.set(slug, enrichedResult);
          this.logger.debug(`✅ Enrichment completed for drug: ${savedDrug.brandName}`);
          return enrichedResult;
        }
      } else {
        // Trigger enrichment and related drugs generation in background
        this.triggerEnrichmentAndRelatedDrugsInBackground(savedDrug);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to create new drug from NDC "${ndc}":`, error);
      throw error;
    }
  }

  /**
   * Trigger both enrichment and related drugs generation in background
   */
  private triggerEnrichmentAndRelatedDrugsInBackground(drug: Drug): void {
    // Trigger enrichment first, then related drugs
    this.triggerEnrichmentViaMCP(drug).catch((error) => {
      this.logger.error(`Background enrichment failed for drug ${drug.id}:`, error);
    });
  }

  /**
   * Trigger AI enrichment via MCP (synchronous version for first-time visits)
   */
  private async triggerEnrichmentViaMCPSync(drug: Drug): Promise<void> {
    try {
      // Check if enrichment generation is already in progress for this drug
      if (this.enrichmentGenerationLocks.has(drug.id)) {
        this.logger.debug(`Enrichment generation already in progress for drug: ${drug.brandName}`);
        return;
      }

      this.logger.debug(`⏳ Triggering synchronous AI enrichment for drug: ${drug.brandName}`);

      // Check for existing enrichment
      const existingEnrichment = await this.enrichmentRepository.findOne({
        where: { drug: { id: drug.id } },
      });

      if (existingEnrichment) {
        this.logger.debug(`Enrichment already exists for drug: ${drug.brandName}`);
        return;
      }

      // Acquire lock
      this.enrichmentGenerationLocks.add(drug.id);
      this.logger.debug(`🔒 Acquired enrichment lock for drug: ${drug.brandName}`);

      try {
        // Use MCP service to enrich the drug data
        const identifiers = [];
        if (drug.ndc) {
          identifiers.push({ type: IdentifierType.NDC, value: drug.ndc });
        }
        if (drug.brandName) {
          identifiers.push({ type: IdentifierType.BRAND_NAME, value: drug.brandName });
        }
        if (drug.genericName) {
          identifiers.push({ type: IdentifierType.GENERIC_NAME, value: drug.genericName });
        }

        if (identifiers.length > 0) {
          const enrichmentResult = await this.enrichmentMcpService.enrichMultipleDrugs({
            identifiers,
            validateIdentifiers: false,
            includeConfidence: true,
          });

          const firstResult = enrichmentResult.results[0];
          if (firstResult?.status === 'success' && firstResult.data) {
            const enrichment = this.enrichmentRepository.create({
              drug: drug,
              title: firstResult.data.title,
              metaDescription: firstResult.data.metaDescription,
              summary: firstResult.data.summary,
              indicationSummary: firstResult.data.indicationSummary,
              sideEffectsSummary: firstResult.data.sideEffectsSummary,
              dosageSummary: firstResult.data.dosageSummary,
              warningsSummary: firstResult.data.warningsSummary,
              contraindicationsSummary: firstResult.data.contraindicationsSummary,
              aiGeneratedFaqs: firstResult.data.aiGeneratedFaqs,
              keywords: firstResult.data.keywords,
              structuredData: firstResult.data.structuredData,
              isReviewed: false,
              isPublished: true,
            });

            await this.enrichmentRepository.save(enrichment);
            this.logger.debug(`✅ Created AI-generated enrichment for drug: ${drug.brandName}`);
          } else {
            // Fallback to basic enrichment if AI fails
            const enrichment = this.enrichmentRepository.create({
              drug: drug,
              title: `${drug.brandName} - Drug Information`,
              metaDescription: `Learn about ${drug.brandName}${drug.genericName ? ` (${drug.genericName})` : ''}, manufactured by ${drug.manufacturer}. Complete drug information for healthcare professionals.`,
              summary: `${drug.brandName} is a prescription medication manufactured by ${drug.manufacturer}.`,
              isReviewed: false,
              isPublished: true,
            });

            await this.enrichmentRepository.save(enrichment);
            this.logger.debug(`✅ Created fallback enrichment for drug: ${drug.brandName}`);
          }
        }
      } catch (enrichmentError) {
        // Check if it's a duplicate key constraint error
        if (
          enrichmentError.code === '23505' ||
          enrichmentError.message?.includes('duplicate key')
        ) {
          this.logger.warn(
            `⚠️ Duplicate key constraint detected for enrichment, enrichment may have been created by another process`,
          );
          // Try to fetch existing enrichment instead of throwing
          try {
            const existingEnrichment = await this.enrichmentRepository.findOne({
              where: { drug: { id: drug.id } },
            });
            if (existingEnrichment) {
              this.logger.log(
                `📋 Found existing enrichment for drug ${drug.brandName}, continuing with related drugs generation`,
              );
            }
          } catch (fetchError) {
            this.logger.error(
              `❌ Failed to fetch existing enrichment after duplicate key error:`,
              fetchError,
            );
          }
        } else {
          throw enrichmentError;
        }
      } finally {
        // Release lock
        this.enrichmentGenerationLocks.delete(drug.id);
        this.logger.debug(`🔓 Released enrichment lock for drug: ${drug.brandName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to trigger synchronous AI enrichment for drug ${drug.id}:`, error);
      throw error;
    }
  }

  /**
   * Refresh existing drug data via MCP (background process)
   */
  private async refreshDrugDataViaMCP(ndc: string, existingDrug: Drug): Promise<void> {
    try {
      this.logger.debug(`Refreshing drug data via MCP for NDC: ${ndc}`);

      // Using FDA service for data refresh - MCP handles enrichment
      const fdaData = await this.fdaService.getDrugByNDC(ndc);
      if (!fdaData) {
        this.logger.warn(`No FDA data found during refresh for NDC: ${ndc}`);
        return;
      }

      // Update existing drug with fresh data
      const updatedData = FdaService.transformFDAResultToDrug(fdaData);
      if (updatedData) {
        // Remove drugId to avoid overwriting the database ID
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { drugId: _, ...dataToUpdate } = updatedData;
        Object.assign(existingDrug, dataToUpdate, { updatedAt: new Date() });
        await this.drugRepository.save(existingDrug);

        // Trigger MCP enrichment refresh
        this.triggerEnrichmentViaMCP(existingDrug).catch((error) => {
          this.logger.error(`Enrichment refresh failed for drug ${existingDrug.id}:`, error);
        });

        this.logger.debug(`Successfully refreshed drug data for NDC: ${ndc}`);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh drug data via MCP for NDC "${ndc}":`, error);
    }
  }

  /**
   * Trigger AI enrichment via MCP (background process)
   */
  private async triggerEnrichmentViaMCP(drug: Drug): Promise<void> {
    try {
      // Check if enrichment generation is already in progress for this drug
      if (this.enrichmentGenerationLocks.has(drug.id)) {
        this.logger.debug(`Enrichment generation already in progress for drug: ${drug.brandName}`);
        return;
      }

      this.logger.debug(`Triggering AI enrichment via MCP for drug: ${drug.brandName}`);

      // Check for existing enrichment
      const existingEnrichment = await this.enrichmentRepository.findOne({
        where: { drug: { id: drug.id } },
      });

      if (existingEnrichment) {
        this.logger.debug(`Enrichment already exists for drug: ${drug.brandName}`);
        // Still trigger related drugs generation even if enrichment exists
        await this.triggerRelatedDrugsGenerationViaMCP(drug);
        return;
      }

      // Acquire lock
      this.enrichmentGenerationLocks.add(drug.id);
      this.logger.debug(`🔒 Acquired enrichment lock for drug: ${drug.brandName}`);

      try {
        // Use MCP service to enrich the drug data
        const identifiers = [];
        if (drug.ndc) {
          identifiers.push({ type: IdentifierType.NDC, value: drug.ndc });
        }
        if (drug.brandName) {
          identifiers.push({ type: IdentifierType.BRAND_NAME, value: drug.brandName });
        }
        if (drug.genericName) {
          identifiers.push({ type: IdentifierType.GENERIC_NAME, value: drug.genericName });
        }

        if (identifiers.length > 0) {
          const enrichmentResult = await this.enrichmentMcpService.enrichMultipleDrugs({
            identifiers,
            validateIdentifiers: false,
            includeConfidence: true,
          });

          const firstResult = enrichmentResult.results[0];
          if (firstResult?.status === 'success' && firstResult.data) {
            const enrichment = this.enrichmentRepository.create({
              drug: drug,
              title: firstResult.data.title,
              metaDescription: firstResult.data.metaDescription,
              summary: firstResult.data.summary,
              indicationSummary: firstResult.data.indicationSummary,
              sideEffectsSummary: firstResult.data.sideEffectsSummary,
              dosageSummary: firstResult.data.dosageSummary,
              warningsSummary: firstResult.data.warningsSummary,
              contraindicationsSummary: firstResult.data.contraindicationsSummary,
              aiGeneratedFaqs: firstResult.data.aiGeneratedFaqs,
              keywords: firstResult.data.keywords,
              structuredData: firstResult.data.structuredData,
              isReviewed: false,
              isPublished: true,
            });

            await this.enrichmentRepository.save(enrichment);
            this.logger.debug(`Created AI-generated enrichment for drug: ${drug.brandName}`);
          } else {
            // Fallback to basic enrichment if AI fails
            const enrichment = this.enrichmentRepository.create({
              drug: drug,
              title: `${drug.brandName} - Drug Information`,
              metaDescription: `Learn about ${drug.brandName}${drug.genericName ? ` (${drug.genericName})` : ''}, manufactured by ${drug.manufacturer}. Complete drug information for healthcare professionals.`,
              summary: `${drug.brandName} is a prescription medication manufactured by ${drug.manufacturer}.`,
              isReviewed: false,
              isPublished: true,
            });

            await this.enrichmentRepository.save(enrichment);
            this.logger.debug(`Created fallback enrichment for drug: ${drug.brandName}`);
          }
        }

        // Also trigger related drugs generation if none exist
        await this.triggerRelatedDrugsGenerationViaMCP(drug);
      } catch (enrichmentError) {
        // Check if it's a duplicate key constraint error
        if (
          enrichmentError.code === '23505' ||
          enrichmentError.message?.includes('duplicate key')
        ) {
          this.logger.warn(
            `⚠️ Duplicate key constraint detected for enrichment, enrichment may have been created by another process`,
          );
          // Try to fetch existing enrichment instead of throwing
          try {
            const existingEnrichment = await this.enrichmentRepository.findOne({
              where: { drug: { id: drug.id } },
            });
            if (existingEnrichment) {
              this.logger.log(
                `📋 Found existing enrichment for drug ${drug.brandName}, continuing with related drugs generation`,
              );
            }
          } catch (fetchError) {
            this.logger.error(
              `❌ Failed to fetch existing enrichment after duplicate key error:`,
              fetchError,
            );
          }
        } else {
          throw enrichmentError;
        }
      } finally {
        // Release lock
        this.enrichmentGenerationLocks.delete(drug.id);
        this.logger.debug(`🔓 Released enrichment lock for drug: ${drug.brandName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to trigger AI enrichment for drug ${drug.id}:`, error);
    }
  }

  /**
   * Trigger related drugs generation via MCP (background process)
   */
  private async triggerRelatedDrugsGenerationViaMCP(drug: Drug): Promise<void> {
    try {
      // Check if generation is already in progress for this drug
      if (this.relatedDrugsGenerationLocks.has(drug.id)) {
        this.logger.debug(
          `Related drugs generation already in progress for drug: ${drug.brandName}`,
        );
        return;
      }

      // Check if related drugs already exist
      const existingRelatedDrugs = await this.relatedDrugRepository.find({
        where: { sourceDrug: { id: drug.id } },
      });

      if (existingRelatedDrugs.length > 0) {
        this.logger.debug(`Related drugs already exist for drug: ${drug.brandName}`);
        return;
      }

      // Acquire lock
      this.relatedDrugsGenerationLocks.add(drug.id);
      this.logger.debug(`🔒 Acquired lock for related drugs generation: ${drug.brandName}`);

      this.logger.log(
        `🚀 Generating related drugs via MCP for drug: ${drug.brandName} (ID: ${drug.id}, NDC: ${drug.ndc})`,
      );

      // Try to use MCP tools first
      let relatedDrugsData: any[] = [];

      try {
        this.logger.debug(`📞 Calling MCP tools service for related drugs...`);
        const mcpRelatedDrugs = await this.mcpToolsService.findRelatedDrugsViaMCP(
          {
            type: 'ndc',
            value: drug.ndc,
          },
          5,
          ['similar_indication', 'same_class', 'alternative'],
          true,
        );

        this.logger.debug(`📊 MCP returned ${mcpRelatedDrugs.length} related drugs`);

        if (mcpRelatedDrugs.length > 0) {
          relatedDrugsData = mcpRelatedDrugs.map((rd: any) => ({
            name: rd.name,
            ndc: rd.ndc,
            brandName: rd.brandName,
            genericName: rd.genericName,
            manufacturer: rd.manufacturer,
            indication: rd.indication,
            description: rd.description,
            relationshipType: rd.relationshipType,
            confidenceScore: rd.confidenceScore,
            metadata: {
              generatedBy: 'mcp',
              timestamp: new Date().toISOString(),
              sourceDrug: drug.ndc,
            },
          }));
          this.logger.debug(`✅ MCP generated ${relatedDrugsData.length} related drugs`);
        } else {
          this.logger.debug(`⚠️ MCP returned no related drugs`);
        }
      } catch (mcpError) {
        this.logger.error(
          `❌ MCP related drugs generation failed, falling back to basic generation:`,
          mcpError,
        );
      }

      // Fallback to basic generation if MCP fails or returns no results
      if (relatedDrugsData.length === 0) {
        this.logger.debug(`🔄 Falling back to basic related drugs generation...`);
        relatedDrugsData = await this.generateRelatedDrugsData(drug);
        this.logger.debug(`📊 Basic generation returned ${relatedDrugsData.length} related drugs`);
      }

      if (relatedDrugsData.length > 0) {
        this.logger.debug(`💾 Saving ${relatedDrugsData.length} related drugs to database...`);
        await this.relatedDrugsService.saveRelatedDrugs(drug.id, relatedDrugsData);
        this.logger.log(
          `✅ Successfully generated and saved ${relatedDrugsData.length} related drugs for drug: ${drug.brandName}`,
        );
      } else {
        this.logger.warn(`⚠️ No related drugs were generated for drug: ${drug.brandName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to trigger related drugs generation for drug ${drug.id}:`, error);
    } finally {
      // Release lock
      this.relatedDrugsGenerationLocks.delete(drug.id);
      this.logger.debug(`🔓 Released lock for related drugs generation: ${drug.brandName}`);
    }
  }

  /**
   * Generate related drugs data based on drug information
   * This is a simplified implementation that can be enhanced with full MCP integration
   */
  private async generateRelatedDrugsData(drug: Drug): Promise<any[]> {
    try {
      // For now, we'll create a basic set of related drugs based on common patterns
      // This should be replaced with actual MCP tool calls in the future
      const relatedDrugs = [];

      // Example: If it's a statin, suggest other statins
      if (
        drug.brandName?.toLowerCase().includes('statin') ||
        drug.genericName?.toLowerCase().includes('statin')
      ) {
        relatedDrugs.push({
          name: 'Atorvastatin',
          brandName: 'Lipitor',
          genericName: 'Atorvastatin',
          manufacturer: 'Pfizer',
          indication: 'High cholesterol',
          description: 'Another statin medication for cholesterol management',
          relationshipType: 'same_class',
          confidenceScore: 0.8,
        });
      }

      // Example: If it's an ACE inhibitor, suggest other ACE inhibitors
      if (
        drug.brandName?.toLowerCase().includes('pril') ||
        drug.genericName?.toLowerCase().includes('pril')
      ) {
        relatedDrugs.push({
          name: 'Lisinopril',
          brandName: 'Prinivil',
          genericName: 'Lisinopril',
          manufacturer: 'Merck',
          indication: 'Hypertension',
          description: 'Another ACE inhibitor for blood pressure management',
          relationshipType: 'same_class',
          confidenceScore: 0.8,
        });
      }

      // Add generic equivalent if available
      if (drug.brandName && !drug.genericName) {
        relatedDrugs.push({
          name: drug.brandName,
          brandName: drug.brandName,
          genericName: 'Generic equivalent',
          manufacturer: 'Various',
          indication: drug.indications || 'Same as brand name',
          description: 'Generic equivalent of the brand name medication',
          relationshipType: 'generic_equivalent',
          confidenceScore: 0.9,
        });
      }

      return relatedDrugs.slice(0, 3); // Limit to 3 related drugs for now
    } catch (error) {
      this.logger.error(`Failed to generate related drugs data for drug ${drug.id}:`, error);
      return [];
    }
  }

  /**
   * Get related drugs for a specific drug
   */
  async getRelatedDrugs(drugId: number): Promise<RelatedDrug[]> {
    try {
      // First check if the drug exists
      const drug = await this.drugRepository.findOne({ where: { id: drugId } });
      if (!drug) {
        throw new NotFoundException(`Drug with ID ${drugId} not found`);
      }

      // Get related drugs
      const relatedDrugs = await this.relatedDrugRepository.find({
        where: { sourceDrug: { id: drugId } },
        order: { confidenceScore: 'DESC' },
      });

      this.logger.debug(`Found ${relatedDrugs.length} related drugs for drug ID ${drugId}`);
      return relatedDrugs;
    } catch (error) {
      this.logger.error(`Error getting related drugs for drug ID ${drugId}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger related drugs generation via MCP
   */
  async generateRelatedDrugsViaMCP(
    drugId: number,
  ): Promise<{ message: string; relatedDrugsCount: number }> {
    try {
      // First check if the drug exists
      const drug = await this.drugRepository.findOne({ where: { id: drugId } });
      if (!drug) {
        throw new NotFoundException(`Drug with ID ${drugId} not found`);
      }

      this.logger.debug(`Manually triggering related drugs generation for drug: ${drug.brandName}`);

      // Clear existing related drugs first
      await this.relatedDrugRepository.delete({ sourceDrug: { id: drugId } });

      // Generate new related drugs
      await this.triggerRelatedDrugsGenerationViaMCP(drug);

      // Get the count of newly generated related drugs
      const relatedDrugsCount = await this.relatedDrugRepository.count({
        where: { sourceDrug: { id: drugId } },
      });

      return {
        message: `Successfully generated ${relatedDrugsCount} related drugs for ${drug.brandName}`,
        relatedDrugsCount,
      };
    } catch (error) {
      this.logger.error(`Error generating related drugs for drug ID ${drugId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all drug slugs for sitemap generation with caching
   */
  async getAllDrugSlugs(): Promise<string[]> {
    try {
      // Check if we have valid cached data
      if (this.drugSlugsCache && this.isCacheValid(this.drugSlugsCache.timestamp)) {
        this.logger.debug(`Returning cached drug slugs (${this.drugSlugsCache.data.length} slugs)`);
        return this.drugSlugsCache.data;
      }

      this.logger.debug('Cache miss - fetching fresh drug slugs from database');

      // Get all drugs with their enrichment data to generate slugs
      const drugs = await this.drugRepository.find({
        where: { ndc: Not(IsNull()) }, // Only drugs with NDC
        relations: ['enrichment'],
        select: ['id', 'brandName', 'genericName', 'ndc', 'enrichment'],
      });

      const slugs: string[] = [];

      for (const drug of drugs) {
        try {
          // Generate slug using the same logic as findBySlug
          const brandName = drug.brandName || drug.genericName || 'drug';
          const ndc = drug.ndc || '';
          const slug = `${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${ndc.replace(/[^0-9-]/g, '')}`;

          if (slug && slug.length > 0) {
            slugs.push(slug);
          }
        } catch (error) {
          this.logger.warn(`Failed to generate slug for drug ID ${drug.id}:`, error);
          // Continue with other drugs
        }
      }

      // Cache the results
      this.drugSlugsCache = {
        data: slugs,
        timestamp: Date.now(),
      };

      this.logger.log(`Generated and cached ${slugs.length} drug slugs for sitemap`);
      return slugs;
    } catch (error) {
      this.logger.error('Error fetching drug slugs:', error);

      // Return cached data if available, even if expired
      if (this.drugSlugsCache) {
        this.logger.warn('Returning stale cached data due to error');
        return this.drugSlugsCache.data;
      }

      return [];
    }
  }

  /**
   * Checks if cache is still valid based on TTL
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Invalidates the drug slugs cache (useful when new drugs are added)
   */
  invalidateDrugSlugsCache(): void {
    this.drugSlugsCache = null;
    this.logger.debug('Drug slugs cache invalidated');
  }
}
