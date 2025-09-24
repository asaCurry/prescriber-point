import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService, DrugEnrichmentResult } from '../ai.service';
import { FdaService } from '../../fda/fda.service';
import { DrugsService } from '../../drugs/drugs.service';
import { Drug } from '../../drugs/entities/drug.entity';
import { DrugEnrichment } from '../../drugs/entities/drug-enrichment.entity';
import {
  EnrichmentRequest,
  DrugIdentifier,
  IdentifierType,
  EnrichmentValidationResult,
} from '../dto/enrichment-request.dto';
import { IdentifierValidationService } from './identifier-validation.service';
import { RelatedDrugsService, RelatedDrugData } from './related-drugs.service';
import { AIServiceException, AIErrorClassifier } from '../exceptions/ai-service.exceptions';
import { CircuitBreakerFactory } from '../utils/circuit-breaker';
import { AIValidationMiddleware } from '../middleware/validation.middleware';

export interface EnrichmentBatchResult {
  requestId: string;
  timestamp: Date;
  totalRequested: number;
  totalProcessed: number;
  totalErrors: number;
  validationResult: EnrichmentValidationResult;
  results: EnrichmentResult[];
  summary: {
    successRate: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
}

export interface EnrichmentResult {
  identifier: DrugIdentifier;
  status: 'success' | 'error' | 'not_found';
  data?: DrugEnrichmentResult;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  processingTimeMs: number;
  dataSource: 'fda' | 'database' | 'fallback';
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly fdaCircuitBreaker = CircuitBreakerFactory.getFDACircuitBreaker();
  private readonly aiCircuitBreaker = CircuitBreakerFactory.getAICircuitBreaker();
  private readonly validationMiddleware = new AIValidationMiddleware();

  constructor(
    private readonly aiService: AIService,
    private readonly fdaService: FdaService,
    private readonly drugsService: DrugsService,
    private readonly validationService: IdentifierValidationService,
    private readonly relatedDrugsService: RelatedDrugsService,
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
    @InjectRepository(DrugEnrichment)
    private readonly enrichmentRepository: Repository<DrugEnrichment>,
  ) {}

  /**
   * Main enrichment method that handles multiple identifiers
   */
  async enrichMultipleDrugs(request: EnrichmentRequest): Promise<EnrichmentBatchResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `Starting enrichment batch ${requestId} for ${request.identifiers.length} identifiers`,
    );

    // Step 1: Validate identifiers if requested
    let validationResult: EnrichmentValidationResult;
    if (request.validateIdentifiers) {
      validationResult = await this.validationService.validateIdentifiers(request.identifiers);

      if (validationResult.errorCount > 0) {
        this.logger.warn(
          `Validation found ${validationResult.errorCount} errors in batch ${requestId}`,
        );
      }
    } else {
      // Skip validation - assume all identifiers are valid
      validationResult = {
        isValid: true,
        validIdentifiers: request.identifiers,
        errors: [],
        warningCount: 0,
        errorCount: 0,
      };
    }

    // Step 2: Process valid identifiers
    const results: EnrichmentResult[] = [];
    const identifiersToProcess = request.validateIdentifiers
      ? validationResult.validIdentifiers
      : request.identifiers;

    for (const identifier of identifiersToProcess) {
      try {
        const result = await this.enrichSingleDrug(identifier, request.context);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to process identifier ${identifier.type}:${identifier.value}`,
          error,
        );
        results.push({
          identifier,
          status: 'error',
          error: {
            type: 'PROCESSING_ERROR',
            message: error.message || 'Unknown processing error',
            details: error,
          },
          processingTimeMs: 0,
          dataSource: 'fallback',
        });
      }
    }

    // Step 3: Calculate summary statistics
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;
    const successfulResults = results.filter((r) => r.status === 'success');
    const successRate = results.length > 0 ? successfulResults.length / results.length : 0;
    const averageConfidence = this.calculateAverageConfidence(successfulResults);

    const batchResult: EnrichmentBatchResult = {
      requestId,
      timestamp: new Date(startTime),
      totalRequested: request.identifiers.length,
      totalProcessed: results.length,
      totalErrors: results.filter((r) => r.status === 'error').length,
      validationResult,
      results,
      summary: {
        successRate,
        averageConfidence,
        processingTimeMs,
      },
    };

    this.logger.log(
      `Completed enrichment batch ${requestId} in ${processingTimeMs}ms with ${successRate * 100}% success rate`,
    );

    return batchResult;
  }

  /**
   * Enriches a single drug identifier
   */
  private async enrichSingleDrug(
    identifier: DrugIdentifier,
    context?: string,
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      // Step 1: Try to find existing data in database
      const existingDrug = await this.findExistingDrug(identifier);
      if (existingDrug) {
        this.logger.debug(`Found existing drug data for ${identifier.type}:${identifier.value}`);
        return {
          identifier,
          status: 'success',
          data: this.convertToEnrichmentResult(existingDrug),
          processingTimeMs: Date.now() - startTime,
          dataSource: 'database',
        };
      }

      // Step 2: Fetch from FDA if not in database
      const fdaData = await this.fetchFromFDA(identifier);
      if (!fdaData) {
        return {
          identifier,
          status: 'not_found',
          error: {
            type: 'NOT_FOUND',
            message: `No FDA data found for ${identifier.type}: ${identifier.value}`,
          },
          processingTimeMs: Date.now() - startTime,
          dataSource: 'fda',
        };
      }

      // Step 3: Enrich with AI
      const enrichedData = await this.aiService.enrichDrugData(fdaData);

      // Step 4: Apply context if provided
      if (context) {
        enrichedData.summary = await this.applyContextToSummary(enrichedData.summary, context);
      }

      // Step 5: Save to database for future use
      await this.saveDrugData(identifier, fdaData, enrichedData);

      return {
        identifier,
        status: 'success',
        data: enrichedData,
        processingTimeMs: Date.now() - startTime,
        dataSource: 'fda',
      };
    } catch (error) {
      this.logger.error(`Error enriching ${identifier.type}:${identifier.value}`, error);
      return {
        identifier,
        status: 'error',
        error: {
          type: error.constructor.name,
          message: error.message,
          details: error.stack,
        },
        processingTimeMs: Date.now() - startTime,
        dataSource: 'fallback',
      };
    }
  }

  /**
   * Finds existing drug data in the database
   */
  private async findExistingDrug(identifier: DrugIdentifier): Promise<any> {
    try {
      // Use the general search method for all identifier types
      const results = await this.drugsService.searchDrugs(identifier.value, 1);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.logger.warn(
        `Error searching database for ${identifier.type}:${identifier.value}`,
        error,
      );
      return null;
    }
  }

  /**
   * Fetches drug data from FDA
   */
  /**
   * Enhanced FDA fetch with circuit breaker and error handling
   */
  private async fetchFromFDA(identifier: DrugIdentifier): Promise<any> {
    const correlationId = `fda_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      this.logger.debug(`Fetching from FDA for ${identifier.type}:${identifier.value}`, {
        correlationId,
      });

      // Validate identifier before making FDA call
      const validationResult = await this.validationMiddleware.validateInput(
        AIValidationMiddleware.DrugIdentifierSchema,
        identifier,
        { operation: 'fetchFromFDA', correlationId },
      );

      if (!validationResult.success) {
        throw AIServiceException.invalidIdentifier(identifier, validationResult.warnings);
      }

      // Use circuit breaker for FDA API calls
      return await this.fdaCircuitBreaker.execute(async () => {
        switch (identifier.type) {
          case IdentifierType.NDC:
            this.logger.debug(`FDA NDC lookup: ${identifier.value}`, { correlationId });
            const ndcResult = await this.fdaService.getDrugByNDC(identifier.value);
            if (!ndcResult) {
              throw AIServiceException.fdaNotFound(`NDC ${identifier.value}`);
            }
            return ndcResult;

          case IdentifierType.BRAND_NAME:
          case IdentifierType.GENERIC_NAME:
            this.logger.debug(`FDA name search: ${identifier.value}`, { correlationId });
            const results = await this.fdaService.searchDrugs(identifier.value, 1);
            if (results.length === 0) {
              throw AIServiceException.fdaNotFound(`${identifier.type} "${identifier.value}"`);
            }
            return results[0];

          case IdentifierType.UPC:
            this.logger.warn(`UPC search not supported by FDA API: ${identifier.value}`, {
              correlationId,
            });
            throw AIServiceException.invalidInput(`UPC identifiers are not supported by FDA API`, {
              identifier,
              suggestions: ['Try using NDC, brand name, or generic name instead'],
              correlationId,
            });

          default:
            throw AIServiceException.invalidInput(
              `Unsupported identifier type for FDA search: ${identifier.type}`,
              {
                identifier,
                suggestions: ['Supported types: NDC, BRAND_NAME, GENERIC_NAME'],
                correlationId,
              },
            );
        }
      });
    } catch (error) {
      // Classify and enhance the error
      if (error instanceof AIServiceException) {
        throw error;
      }

      // Transform external errors to our exception format
      const aiError = AIErrorClassifier.classifyFDAError({
        ...error,
        identifier: `${identifier.type}:${identifier.value}`,
      });

      this.logger.error(`FDA fetch failed for ${identifier.type}:${identifier.value}`, {
        error: error.message,
        correlationId,
        circuitBreakerState: this.fdaCircuitBreaker.getHealthStatus(),
      });

      throw aiError;
    }
  }

  /**
   * Applies user context to the drug summary
   */
  private async applyContextToSummary(summary: string, context: string): Promise<string> {
    try {
      // Use AI to enhance the summary with the provided context
      // const contextPrompt = `
      // Given this drug summary: "${summary}"

      // And this additional context from the user: "${context}"

      // Please enhance the summary to address the user's specific context while maintaining medical accuracy.
      // Keep the response professional and focused on healthcare provider needs.

      // Enhanced summary:`;

      // This would use the AI service to apply context
      // For now, we'll append the context as a note
      return `${summary}\n\nNote: ${context}`;
    } catch (error) {
      this.logger.warn('Failed to apply context to summary', error);
      return summary;
    }
  }

  /**
   * Saves drug data to database
   */
  private async saveDrugData(
    identifier: DrugIdentifier,
    fdaData: any,
    enrichedData: DrugEnrichmentResult,
  ): Promise<void> {
    try {
      this.logger.debug(`Saving enriched data for ${identifier.type}:${identifier.value}`);

      // Step 1: Create or find the base Drug entity
      const drug = await this.findOrCreateDrug(identifier, fdaData);

      // Step 2: Create or update the DrugEnrichment entity
      let enrichment = await this.enrichmentRepository.findOne({
        where: { drug: { id: drug.id } },
      });

      if (enrichment) {
        // Update existing enrichment
        this.updateEnrichmentFromData(enrichment, enrichedData);
        this.logger.debug(`Updating existing enrichment for drug ID ${drug.id}`);
      } else {
        // Create new enrichment
        enrichment = this.enrichmentRepository.create({
          drug: drug,
          ...this.mapEnrichmentData(enrichedData),
        });
        this.logger.debug(`Creating new enrichment for drug ID ${drug.id}`);
      }

      await this.enrichmentRepository.save(enrichment);
      this.logger.log(
        `Successfully saved enriched data for ${identifier.type}:${identifier.value}`,
      );

      // Create RelatedDrug entities from the relatedDrugs array in enrichment
      await this.createRelatedDrugEntities(drug.id, enrichedData);
    } catch (error) {
      this.logger.warn(
        `Failed to save drug data for ${identifier.type}:${identifier.value}`,
        error,
      );
      // Don't throw - this is not critical for the enrichment flow
    }
  }

  /**
   * Finds existing drug or creates new one from FDA data
   */
  private async findOrCreateDrug(identifier: DrugIdentifier, fdaData: any): Promise<Drug> {
    // Try to find existing drug first
    let drug: Drug | null = null;

    // Search by NDC if we have it
    const ndc = fdaData?.openfda?.product_ndc?.[0] || fdaData?.openfda?.package_ndc?.[0];
    if (ndc) {
      drug = await this.drugRepository.findOne({ where: { ndc } });
    }

    // If not found and we have brand name, search by brand name
    if (!drug && fdaData?.openfda?.brand_name?.[0]) {
      drug = await this.drugRepository.findOne({
        where: { brandName: fdaData.openfda.brand_name[0] },
      });
    }

    // If still not found, create new drug
    if (!drug) {
      const drugData = this.transformFDADataToDrug(identifier, fdaData);
      drug = this.drugRepository.create(drugData);
      drug = await this.drugRepository.save(drug);
      this.logger.debug(`Created new drug entity with ID ${drug.id}`);
    }

    return drug;
  }

  /**
   * Transforms FDA data to Drug entity format
   */
  private transformFDADataToDrug(identifier: DrugIdentifier, fdaData: any): Partial<Drug> {
    const brandName = fdaData?.openfda?.brand_name?.[0] || identifier.value;
    const genericName = fdaData?.openfda?.generic_name?.[0];
    const manufacturer = fdaData?.openfda?.manufacturer_name?.[0] || 'Unknown';
    const ndc = fdaData?.openfda?.product_ndc?.[0] || fdaData?.openfda?.package_ndc?.[0];

    return {
      brandName,
      genericName,
      manufacturer,
      ndc,
      dataSource: 'FDA',
      fdaData: fdaData,
    };
  }

  /**
   * Generates a drug slug from brand name and NDC
   */
  private generateDrugSlug(brandName: string, ndc?: string): string {
    const cleanName = brandName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const cleanNDC = ndc ? ndc.replace(/[^0-9-]/g, '') : '';
    return `${cleanName}-${cleanNDC}`;
  }

  /**
   * Maps enrichment data to DrugEnrichment entity fields
   */
  private mapEnrichmentData(enrichedData: DrugEnrichmentResult): Partial<DrugEnrichment> {
    return {
      title: enrichedData.title,
      metaDescription: enrichedData.metaDescription,
      slug: enrichedData.slug,
      canonicalUrl: null, // Will be generated by frontend
      structuredData: enrichedData.structuredData,
      summary: enrichedData.summary,
      indicationSummary: enrichedData.indicationSummary,
      sideEffectsSummary: enrichedData.sideEffectsSummary,
      dosageSummary: enrichedData.dosageSummary,
      warningsSummary: enrichedData.warningsSummary,
      contraindicationsSummary: enrichedData.contraindicationsSummary,
      aiGeneratedFaqs: enrichedData.aiGeneratedFaqs,
      relatedDrugs: enrichedData.relatedDrugs,
      relatedConditions: enrichedData.relatedConditions,
      keywords: enrichedData.keywords,
      aiModelVersion: 'claude-sonnet-4-20250514',
      confidenceScore: enrichedData.confidenceScore,
      contentHash: this.generateContentHash(enrichedData),
      isReviewed: false,
      isPublished: false,
    };
  }

  /**
   * Updates existing enrichment entity with new data
   */
  private updateEnrichmentFromData(
    enrichment: DrugEnrichment,
    enrichedData: DrugEnrichmentResult,
  ): void {
    const mapped = this.mapEnrichmentData(enrichedData);
    Object.assign(enrichment, mapped);
    enrichment.updatedAt = new Date();
  }

  /**
   * Generates a content hash for change detection
   */
  private generateContentHash(enrichedData: DrugEnrichmentResult): string {
    const content = JSON.stringify({
      title: enrichedData.title,
      summary: enrichedData.summary,
      faqs: enrichedData.aiGeneratedFaqs,
    });

    // Simple hash function - in production you might want to use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Converts existing drug data to enrichment result format
   */
  private convertToEnrichmentResult(drugData: any): DrugEnrichmentResult {
    // Convert your existing drug entity to the enrichment result format
    return {
      title: drugData.title || 'Drug Information',
      metaDescription: drugData.metaDescription || '',
      slug: drugData.slug || '',
      summary: drugData.summary || '',
      indicationSummary: drugData.indicationSummary,
      sideEffectsSummary: drugData.sideEffectsSummary,
      dosageSummary: drugData.dosageSummary,
      warningsSummary: drugData.warningsSummary,
      contraindicationsSummary: drugData.contraindicationsSummary,
      aiGeneratedFaqs: drugData.aiGeneratedFaqs || [],
      relatedDrugs: drugData.relatedDrugs || [],
      relatedConditions: drugData.relatedConditions || [],
      keywords: drugData.keywords || [],
      structuredData: drugData.structuredData || {},
      confidenceScore: drugData.confidenceScore || 0.8,
    };
  }

  /**
   * Calculates average confidence score for successful results
   */
  private calculateAverageConfidence(results: EnrichmentResult[]): number {
    if (results.length === 0) return 0;

    const totalConfidence = results.reduce((sum, result) => {
      return sum + (result.data?.confidenceScore || 0);
    }, 0);

    return totalConfidence / results.length;
  }

  /**
   * Generates a unique request ID
   */
  private generateRequestId(): string {
    return `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates RelatedDrug entities from the enrichment's relatedDrugs array
   * Validates each related drug against FDA API and only saves verified drugs
   */
  private async createRelatedDrugEntities(
    sourceDrugId: number,
    enrichedData: DrugEnrichmentResult,
  ): Promise<void> {
    try {
      // Check if there are related drugs in the enrichment data
      if (!enrichedData.relatedDrugs || enrichedData.relatedDrugs.length === 0) {
        this.logger.debug(`No related drugs found in enrichment data for drug ID ${sourceDrugId}`);
        return;
      }

      this.logger.debug(
        `Validating ${enrichedData.relatedDrugs.length} AI-generated related drugs against FDA API`,
      );

      // Validate and enrich related drugs with FDA data
      const validatedRelatedDrugs = await this.validateAndEnrichRelatedDrugs(
        enrichedData.relatedDrugs,
        enrichedData.confidenceScore || 0.5,
      );

      if (validatedRelatedDrugs.length === 0) {
        this.logger.warn(
          `No related drugs could be validated against FDA API for drug ID ${sourceDrugId}`,
        );
        return;
      }

      // Save the validated related drugs using the RelatedDrugsService
      const savedRelatedDrugs = await this.relatedDrugsService.saveRelatedDrugs(
        sourceDrugId,
        validatedRelatedDrugs,
      );

      this.logger.log(
        `Created ${savedRelatedDrugs.length} FDA-validated RelatedDrug entities for drug ID ${sourceDrugId} (${enrichedData.relatedDrugs.length - validatedRelatedDrugs.length} discarded)`,
      );
    } catch (error) {
      this.logger.error(`Failed to create RelatedDrug entities for drug ID ${sourceDrugId}`, error);
      // Don't throw - this is not critical for the enrichment flow
    }
  }

  /**
   * Validates AI-generated related drug names against FDA API
   * Retries up to 3 times to build a list of 3 validated drugs
   */
  private async validateAndEnrichRelatedDrugs(
    drugNames: string[],
    baseConfidenceScore: number,
  ): Promise<RelatedDrugData[]> {
    const validatedDrugs: RelatedDrugData[] = [];
    const maxRetries = 3;
    const targetCount = 3;
    const processedNames = new Set<string>();

    this.logger.debug(`Starting FDA validation for ${drugNames.length} related drug candidates`);

    // Process each drug name with retry logic
    for (const drugName of drugNames) {
      if (validatedDrugs.length >= targetCount) {
        break; // We have enough validated drugs
      }

      if (processedNames.has(drugName.toLowerCase())) {
        continue; // Skip duplicates
      }
      processedNames.add(drugName.toLowerCase());

      let retryCount = 0;
      let fdaMatch = null;

      // Retry logic for FDA lookup
      while (retryCount < maxRetries && !fdaMatch) {
        try {
          this.logger.debug(`FDA lookup attempt ${retryCount + 1}/${maxRetries} for "${drugName}"`);

          // Use circuit breaker for FDA API calls
          const searchResults = await this.fdaCircuitBreaker.execute(async () => {
            return await this.fdaService.searchDrugs(drugName, 1);
          });

          if (searchResults.length > 0) {
            fdaMatch = searchResults[0];
            this.logger.debug(
              `✅ FDA match found for "${drugName}": ${fdaMatch.brandName || fdaMatch.genericName}`,
            );
          } else {
            this.logger.debug(`❌ No FDA match for "${drugName}" on attempt ${retryCount + 1}`);
          }
        } catch (error) {
          this.logger.warn(
            `FDA lookup error for "${drugName}" on attempt ${retryCount + 1}:`,
            error.message,
          );
        }

        retryCount++;

        // Small delay between retries to avoid overwhelming the API
        if (retryCount < maxRetries && !fdaMatch) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // If we found a valid FDA match, create a RelatedDrugData object
      if (fdaMatch) {
        const relatedDrugData: RelatedDrugData = {
          name: fdaMatch.brandName || fdaMatch.genericName || drugName,
          ndc: fdaMatch.ndc,
          brandName: fdaMatch.brandName,
          genericName: fdaMatch.genericName,
          manufacturer: fdaMatch.manufacturer,
          relationshipType: 'similar_indication',
          confidenceScore: baseConfidenceScore * 0.8, // Slightly lower confidence since it's AI-suggested
          description: `FDA-validated related drug identified during AI enrichment`,
          metadata: {
            enrichmentSource: true,
            fdaValidated: true,
            originalSuggestion: drugName,
            validationDate: new Date().toISOString(),
            aiModelVersion: 'claude-sonnet-4-20250514',
            fdaSource: fdaMatch.source || 'fda',
          },
        };

        validatedDrugs.push(relatedDrugData);
        this.logger.log(
          `✅ Added FDA-validated related drug: ${relatedDrugData.name} (NDC: ${relatedDrugData.ndc})`,
        );
      } else {
        this.logger.warn(
          `❌ Discarding "${drugName}" - could not validate against FDA API after ${maxRetries} attempts`,
        );
      }
    }

    this.logger.log(
      `FDA validation complete: ${validatedDrugs.length}/${drugNames.length} related drugs validated and will be saved`,
    );

    return validatedDrugs;
  }
}
