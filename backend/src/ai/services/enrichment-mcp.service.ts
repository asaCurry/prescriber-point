import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService, DrugEnrichmentResult } from '../ai.service';
import { FdaService } from '../../fda/fda.service';
import { Drug } from '../../drugs/entities/drug.entity';
import {
  EnrichmentRequest,
  DrugIdentifier,
  IdentifierType,
  EnrichmentValidationResult,
} from '../dto/enrichment-request.dto';
import { IdentifierValidationService } from './identifier-validation.service';

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
  dataSource: 'fda' | 'database' | 'fallback' | 'none';
}

@Injectable()
export class EnrichmentMcpService {
  private readonly logger = new Logger(EnrichmentMcpService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly fdaService: FdaService,
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
    private readonly validationService: IdentifierValidationService,
  ) {}

  /**
   * Main enrichment method that handles multiple identifiers
   * Simplified version for MCP without database dependencies
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
   * Simplified version without database dependencies
   */
  private async enrichSingleDrug(
    identifier: DrugIdentifier,
    context?: string,
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      // Step 1: Check if drug exists in our database first
      let existingDrug = null;
      try {
        existingDrug = await this.findExistingDrug(identifier);
      } catch (error) {
        this.logger.debug(
          `Database lookup failed for ${identifier.type}:${identifier.value}`,
          error,
        );
      }

      let fdaData = null;
      let dataSource: 'fda' | 'database' | 'fallback' | 'none' = 'database';

      if (existingDrug) {
        // Use existing drug data
        this.logger.debug(`Found existing drug in database: ${existingDrug.brandName}`);
        fdaData = this.transformDrugToFDAData(existingDrug);
        dataSource = 'database';
      } else {
        // Step 2: Fetch from FDA if not in database
        fdaData = await this.fetchFromFDA(identifier);
        dataSource = 'fda';

        if (!fdaData) {
          return {
            identifier,
            status: 'not_found',
            error: {
              type: 'NOT_FOUND',
              message: `No data found for ${identifier.type}: ${identifier.value}`,
            },
            processingTimeMs: Date.now() - startTime,
            dataSource: 'none',
          };
        }
      }

      // Step 3: Enrich with AI
      const enrichedData = await this.aiService.enrichDrugData(fdaData);

      // Step 4: Apply context if provided
      if (context) {
        enrichedData.summary = await this.applyContextToSummary(enrichedData.summary, context);
      }

      return {
        identifier,
        status: 'success',
        data: enrichedData,
        processingTimeMs: Date.now() - startTime,
        dataSource,
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
   * Fetches drug data from FDA
   */
  private async fetchFromFDA(identifier: DrugIdentifier): Promise<any> {
    try {
      switch (identifier.type) {
        case IdentifierType.NDC:
          return await this.fdaService.getDrugByNDC(identifier.value);

        case IdentifierType.BRAND_NAME:
        case IdentifierType.GENERIC_NAME:
          // Use the general search method for brand and generic names
          const results = await this.fdaService.searchDrugs(identifier.value, 1);
          if (results.length > 0) {
            // Get the full FDA drug data using NDC from search result
            return await this.fdaService.getDrugByNDC(results[0].ndc);
          }
          return null;

        case IdentifierType.UPC:
          // UPC is not supported by FDA API, return null
          this.logger.warn(`UPC search not supported by FDA API: ${identifier.value}`);
          return null;

        default:
          this.logger.warn(`Unsupported identifier type for FDA search: ${identifier.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(
        `Error fetching from FDA for ${identifier.type}:${identifier.value}`,
        error,
      );
      return null;
    }
  }

  /**
   * Finds existing drug in database by identifier
   */
  private async findExistingDrug(identifier: DrugIdentifier): Promise<any> {
    this.logger.debug(`Looking up existing drug for ${identifier.type}: ${identifier.value}`);

    let drug = null;
    switch (identifier.type) {
      case IdentifierType.NDC:
        drug = await this.drugRepository.findOne({
          where: { ndc: identifier.value },
          relations: ['enrichment', 'relatedDrugs'],
        });
        break;

      case IdentifierType.BRAND_NAME:
        drug = await this.drugRepository.findOne({
          where: { brandName: identifier.value },
          relations: ['enrichment', 'relatedDrugs'],
        });
        break;

      case IdentifierType.GENERIC_NAME:
        drug = await this.drugRepository.findOne({
          where: { genericName: identifier.value },
          relations: ['enrichment', 'relatedDrugs'],
        });
        break;

      default:
        this.logger.debug(`Unsupported identifier type: ${identifier.type}`);
        return null;
    }

    this.logger.debug(
      `Database lookup result: ${drug ? `Found ${drug.brandName} (ID: ${drug.id})` : 'Not found'}`,
    );
    return drug;
  }

  /**
   * Transforms database drug to FDA-like format for AI enrichment
   */
  private transformDrugToFDAData(drug: any): any {
    return {
      openfda: {
        brand_name: [drug.brandName],
        generic_name: [drug.genericName],
        manufacturer_name: [drug.manufacturer],
        product_ndc: [drug.ndc],
        package_ndc: [drug.ndc],
      },
      indications_and_usage: [drug.indications],
      warnings: [drug.warnings],
      dosage_and_administration: [drug.dosage],
      contraindications: [drug.contraindications],
    };
  }

  /**
   * Applies user context to the drug summary
   */
  private async applyContextToSummary(summary: string, context: string): Promise<string> {
    try {
      // For now, we'll append the context as a note
      // In a full implementation, this could use AI to enhance the summary
      return `${summary}\n\nNote: ${context}`;
    } catch (error) {
      this.logger.warn('Failed to apply context to summary', error);
      return summary;
    }
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
}
