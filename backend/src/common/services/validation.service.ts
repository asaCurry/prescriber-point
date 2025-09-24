import { Injectable } from '@nestjs/common';
import {
  DrugIdentifierSchema,
  EnrichmentRequestSchema,
  NDCSchema,
  CreateDrugDtoSchema,
  UpdateDrugDtoSchema,
  CreateRelatedDrugDtoSchema,
  UpdateRelatedDrugDtoSchema,
  CreateDrugEnrichmentDtoSchema,
  UpdateDrugEnrichmentDtoSchema,
  FDALabelSchema,
  DrugSearchResultSchema,
  DrugWithEnrichmentSchema,
  DrugEnrichmentWithDrugSchema,
  DrugWithRelatedDrugsSchema,
  FullDrugSchema,
  RelationshipValidationSchema,
  RelatedDrugRelationshipValidationSchema,
  type DrugIdentifier,
  type EnrichmentRequest,
  type CreateDrugDto,
  type UpdateDrugDto,
  type CreateRelatedDrugDto,
  type UpdateRelatedDrugDto,
  type CreateDrugEnrichmentDto,
  type UpdateDrugEnrichmentDto,
  type FDALabel,
  type DrugSearchResult,
  type DrugWithEnrichment,
  type DrugEnrichmentWithDrug,
  type DrugWithRelatedDrugs,
  type FullDrug,
  type RelationshipValidation,
  type RelatedDrugRelationshipValidation,
} from '../schemas/entity-schemas';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class ValidationService {
  /**
   * Validate a single drug identifier with detailed error messages
   */
  validateDrugIdentifier(data: unknown): ValidationResult<DrugIdentifier> {
    const result = DrugIdentifierSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate multiple drug identifiers
   */
  validateDrugIdentifiers(data: unknown[]): ValidationResult<DrugIdentifier[]> {
    const results = data.map((item, index) => {
      const validation = this.validateDrugIdentifier(item);
      return { index, ...validation };
    });

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      const errors = failures.map((f) => `Item ${f.index}: ${f.errors?.join(', ')}`);
      return { success: false, errors };
    }

    const validData = results.map((r) => r.data!);
    return { success: true, data: validData };
  }

  /**
   * Validate enrichment request with business logic
   */
  validateEnrichmentRequest(data: unknown): ValidationResult<EnrichmentRequest> {
    const result = EnrichmentRequestSchema.safeParse(data);

    if (result.success) {
      const warnings: string[] = [];

      // Business logic warnings
      if (result.data.identifiers.length > 5) {
        warnings.push('Large number of identifiers may slow processing');
      }

      if (result.data.context && result.data.context.length > 500) {
        warnings.push('Long context may affect AI processing quality');
      }

      return { success: true, data: result.data, warnings };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate NDC with format checking and normalization
   */
  validateNDC(ndc: unknown): ValidationResult<string> {
    const result = NDCSchema.safeParse(ndc);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => err.message);
    return { success: false, errors };
  }

  /**
   * Validate drug creation data
   */
  validateCreateDrug(data: unknown): ValidationResult<CreateDrugDto> {
    const result = CreateDrugDtoSchema.safeParse(data);

    if (result.success) {
      const warnings: string[] = [];

      // Business logic warnings
      if (!result.data.genericName) {
        warnings.push('Generic name not provided - this may affect search functionality');
      }

      if (!result.data.fdaData) {
        warnings.push('No FDA data provided - enrichment features will be limited');
      }

      return { success: true, data: result.data, warnings };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate drug update data
   */
  validateUpdateDrug(data: unknown): ValidationResult<UpdateDrugDto> {
    const result = UpdateDrugDtoSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate drug enrichment creation data
   */
  validateCreateDrugEnrichment(data: unknown): ValidationResult<CreateDrugEnrichmentDto> {
    const result = CreateDrugEnrichmentDtoSchema.safeParse(data);

    if (result.success) {
      const warnings: string[] = [];

      // Content quality warnings
      if (result.data.confidenceScore && result.data.confidenceScore < 0.5) {
        warnings.push('Low confidence score - consider manual review');
      }

      if (!result.data.title || !result.data.metaDescription) {
        warnings.push('Missing SEO fields - this may affect search visibility');
      }

      return { success: true, data: result.data, warnings };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate drug enrichment update data
   */
  validateUpdateDrugEnrichment(data: unknown): ValidationResult<UpdateDrugEnrichmentDto> {
    const result = UpdateDrugEnrichmentDtoSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate FDA label data with comprehensive checks
   */
  validateFDALabel(data: unknown): ValidationResult<FDALabel> {
    const result = FDALabelSchema.safeParse(data);

    if (result.success) {
      const warnings: string[] = [];

      // Data quality warnings
      if (!result.data.openfda.brand_name?.length) {
        warnings.push('No brand name found in FDA data');
      }

      if (!result.data.openfda.generic_name?.length) {
        warnings.push('No generic name found in FDA data');
      }

      if (!result.data.indications_and_usage?.length) {
        warnings.push('No indications found in FDA data');
      }

      return { success: true, data: result.data, warnings };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate drug search result
   */
  validateDrugSearchResult(data: unknown): ValidationResult<DrugSearchResult> {
    const result = DrugSearchResultSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Batch validation utility
   */
  validateBatch<T>(
    data: unknown[],
    validator: (item: unknown) => ValidationResult<T>,
  ): {
    successful: T[];
    failed: Array<{ index: number; errors: string[] }>;
    warnings: string[];
  } {
    const results = data.map((item, index) => ({ index, ...validator(item) }));

    const successful = results.filter((r) => r.success).map((r) => r.data!);

    const failed = results
      .filter((r) => !r.success)
      .map((r) => ({ index: r.index, errors: r.errors || [] }));

    const warnings = results.flatMap((r) => r.warnings || []);

    return { successful, failed, warnings };
  }

  /**
   * Sanitize and normalize drug data for consistency
   */
  sanitizeDrugData(data: Partial<CreateDrugDto>): Partial<CreateDrugDto> {
    return {
      ...data,
      brandName: data.brandName?.trim(),
      genericName: data.genericName?.trim(),
      manufacturer: data.manufacturer?.trim(),
      ndc: data.ndc?.trim().replace(/[^0-9-]/g, ''),
      dataSource: data.dataSource?.trim().toUpperCase(),
      indications: data.indications?.trim(),
      warnings: data.warnings?.trim(),
      dosage: data.dosage?.trim(),
      contraindications: data.contraindications?.trim(),
    };
  }

  /**
   * Check data completeness and quality
   */
  assessDataQuality(drug: CreateDrugDto): {
    score: number; // 0-1
    missing: string[];
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const missing: string[] = [];
    let score = 0;

    // Core identifying fields
    if (drug.brandName) score += 0.2;
    else missing.push('brandName');

    if (drug.ndc) score += 0.2;
    else missing.push('ndc');

    if (drug.manufacturer) score += 0.2;
    else missing.push('manufacturer');

    if (drug.genericName) score += 0.2;
    else missing.push('genericName');

    // Data source and metadata
    if (drug.dataSource) score += 0.1;
    else missing.push('dataSource');

    if (drug.fdaData) score += 0.1;
    else missing.push('fdaData');

    const quality =
      score >= 0.9 ? 'excellent' : score >= 0.7 ? 'good' : score >= 0.5 ? 'fair' : 'poor';

    return { score, missing, quality };
  }

  /**
   * Validate relationship consistency between Drug and DrugEnrichment entities
   */
  validateDrugEnrichmentRelationship(
    drugId: number,
    enrichmentDrugId: number,
  ): ValidationResult<RelationshipValidation> {
    const result = RelationshipValidationSchema.safeParse({
      drugId,
      enrichmentDrugId,
    });

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate a Drug entity with its optional enrichment
   */
  validateDrugWithEnrichment(data: unknown): ValidationResult<DrugWithEnrichment> {
    const result = DrugWithEnrichmentSchema.safeParse(data);

    if (result.success) {
      // Additional validation for relationship consistency
      const drug = result.data;
      if (drug.enrichment && drug.id && drug.enrichment.drug.id !== drug.id) {
        return {
          success: false,
          errors: [
            `Relationship error: Drug ID (${drug.id}) does not match enrichment drug ID (${drug.enrichment.drug.id})`,
          ],
        };
      }

      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate a DrugEnrichment entity with its drug relationship
   */
  validateDrugEnrichmentWithDrug(data: unknown): ValidationResult<DrugEnrichmentWithDrug> {
    const result = DrugEnrichmentWithDrugSchema.safeParse(data);

    if (result.success) {
      // Additional validation for relationship consistency
      // This validation is no longer needed since we're using the relation field
      // The relationship is automatically maintained by TypeORM

      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Comprehensive entity relationship validation
   */
  validateEntityRelationships(
    drugs: unknown[],
    enrichments: unknown[],
  ): ValidationResult<{
    validDrugs: DrugWithEnrichment[];
    validEnrichments: DrugEnrichmentWithDrug[];
    orphanedEnrichments: any[];
    relationshipErrors: string[];
  }> {
    const validDrugs: DrugWithEnrichment[] = [];
    const validEnrichments: DrugEnrichmentWithDrug[] = [];
    const orphanedEnrichments: any[] = [];
    const relationshipErrors: string[] = [];

    // Validate individual drugs
    for (const drug of drugs) {
      const drugValidation = this.validateDrugWithEnrichment(drug);
      if (drugValidation.success && drugValidation.data) {
        validDrugs.push(drugValidation.data);
      } else {
        relationshipErrors.push(...(drugValidation.errors || []));
      }
    }

    // Validate individual enrichments and check for orphans
    const drugIds = new Set(validDrugs.map((d) => d.id).filter(Boolean));

    for (const enrichment of enrichments) {
      const enrichmentValidation = this.validateDrugEnrichmentWithDrug(enrichment);
      if (enrichmentValidation.success && enrichmentValidation.data) {
        validEnrichments.push(enrichmentValidation.data);

        // Check if enrichment has a valid drug reference
        if (!drugIds.has(enrichmentValidation.data.drug.id)) {
          orphanedEnrichments.push(enrichment);
          relationshipErrors.push(
            `Orphaned enrichment: No drug found with ID ${enrichmentValidation.data.drug.id}`,
          );
        }
      } else {
        relationshipErrors.push(...(enrichmentValidation.errors || []));
      }
    }

    return {
      success: relationshipErrors.length === 0,
      data: {
        validDrugs,
        validEnrichments,
        orphanedEnrichments,
        relationshipErrors,
      },
      errors: relationshipErrors.length > 0 ? relationshipErrors : undefined,
    };
  }

  /**
   * Validate RelatedDrug creation data
   */
  validateCreateRelatedDrug(data: unknown): ValidationResult<CreateRelatedDrugDto> {
    const result = CreateRelatedDrugDtoSchema.safeParse(data);

    if (result.success) {
      const warnings: string[] = [];

      // Business logic warnings
      if (!result.data.brandName && !result.data.genericName) {
        warnings.push(
          'Neither brand name nor generic name provided - this may affect search functionality',
        );
      }

      if (!result.data.ndc) {
        warnings.push('No NDC provided - this may limit drug identification capabilities');
      }

      if (!result.data.confidenceScore) {
        warnings.push('No confidence score provided - consider adding for quality assessment');
      }

      return {
        success: true,
        data: result.data,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate RelatedDrug update data
   */
  validateUpdateRelatedDrug(data: unknown): ValidationResult<UpdateRelatedDrugDto> {
    const result = UpdateRelatedDrugDtoSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate relationship consistency between Drug and RelatedDrug entities
   */
  validateRelatedDrugRelationship(
    sourceDrugId: number,
    relatedDrugSourceDrugId: number,
  ): ValidationResult<RelatedDrugRelationshipValidation> {
    const result = RelatedDrugRelationshipValidationSchema.safeParse({
      sourceDrugId,
      relatedDrugSourceDrugId,
    });

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate a Drug entity with its related drugs
   */
  validateDrugWithRelatedDrugs(data: unknown): ValidationResult<DrugWithRelatedDrugs> {
    const result = DrugWithRelatedDrugsSchema.safeParse(data);

    if (result.success) {
      // Additional validation for relationship consistency
      const drug = result.data;
      if (drug.relatedDrugs && drug.id) {
        for (const relatedDrug of drug.relatedDrugs) {
          if (relatedDrug.sourceDrugId !== drug.id) {
            return {
              success: false,
              errors: [
                `Relationship error: Drug ID (${drug.id}) does not match related drug source ID (${relatedDrug.sourceDrugId})`,
              ],
            };
          }
        }
      }

      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Validate a full Drug entity with all relationships
   */
  validateFullDrug(data: unknown): ValidationResult<FullDrug> {
    const result = FullDrugSchema.safeParse(data);

    if (result.success) {
      // Additional validation for relationship consistency
      const drug = result.data;
      const errors: string[] = [];

      // Check enrichment relationship
      if (drug.enrichment && drug.id && drug.enrichment.drug.id !== drug.id) {
        errors.push(
          `Enrichment relationship error: Drug ID (${drug.id}) does not match enrichment drug ID (${drug.enrichment.drug.id})`,
        );
      }

      // Check related drugs relationships
      if (drug.relatedDrugs && drug.id) {
        for (const relatedDrug of drug.relatedDrugs) {
          if (relatedDrug.sourceDrugId !== drug.id) {
            errors.push(
              `Related drug relationship error: Drug ID (${drug.id}) does not match related drug source ID (${relatedDrug.sourceDrugId})`,
            );
          }
        }
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
  }

  /**
   * Sanitize RelatedDrug data by trimming whitespace and normalizing case
   */
  sanitizeRelatedDrugData(data: any): any {
    const sanitized = { ...data };

    // Trim string fields
    if (sanitized.name) sanitized.name = sanitized.name.trim();
    if (sanitized.brandName) sanitized.brandName = sanitized.brandName.trim();
    if (sanitized.genericName) sanitized.genericName = sanitized.genericName.trim();
    if (sanitized.manufacturer) sanitized.manufacturer = sanitized.manufacturer.trim();
    if (sanitized.indication) sanitized.indication = sanitized.indication.trim();
    if (sanitized.description) sanitized.description = sanitized.description.trim();
    if (sanitized.relationshipType)
      sanitized.relationshipType = sanitized.relationshipType.trim().toLowerCase();

    // Clean NDC
    if (sanitized.ndc) {
      sanitized.ndc = sanitized.ndc.replace(/[^0-9\-]/g, '');
    }

    return sanitized;
  }
}
