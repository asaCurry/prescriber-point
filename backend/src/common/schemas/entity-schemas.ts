import { z } from 'zod';

/**
 * Zod schemas that mirror our TypeORM entities for consistent validation
 * These schemas use the exact same constraints as defined in our TypeORM entities
 */

// Drug Entity Schema (based on updated drug.entity.ts)
export const DrugEntitySchema = z.object({
  id: z.number().int().positive().optional(), // Auto-generated

  // Core drug information (all nullable with length constraints)
  brandName: z.string().max(200, 'Brand name must be 200 characters or less').nullable().optional(),
  genericName: z
    .string()
    .max(200, 'Generic name must be 200 characters or less')
    .nullable()
    .optional(),
  manufacturer: z
    .string()
    .max(200, 'Manufacturer must be 200 characters or less')
    .nullable()
    .optional(),
  ndc: z.string().max(20, 'NDC must be 20 characters or less').nullable().optional(), // unique constraint

  // Drug content fields (TEXT type)
  indications: z.string().nullable().optional(),
  warnings: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  contraindications: z.string().nullable().optional(),

  // Data source and metadata
  fdaData: z.record(z.any()).nullable().optional(), // JSONB field
  dataSource: z
    .string()
    .max(200, 'Data source must be 200 characters or less')
    .nullable()
    .optional(),

  // Timestamps (auto-generated)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Drug Enrichment Entity Schema (based on drug-enrichment.entity.ts)
export const DrugEnrichmentEntitySchema = z.object({
  id: z.number().int().positive().optional(), // Auto-generated
  drug: z.object({
    id: z.number().int().positive(),
  }),

  // SEO fields with exact TypeORM constraints
  title: z.string().max(200, 'Title must be 200 characters or less').nullable().optional(),
  metaDescription: z.string().nullable().optional(), // TEXT field, no length limit
  slug: z.string().max(200, 'Slug must be 200 characters or less').nullable().optional(),
  canonicalUrl: z
    .string()
    .max(500, 'Canonical URL must be 500 characters or less')
    .nullable()
    .optional(),
  structuredData: z.record(z.any()).nullable().optional(), // JSONB field

  // Human-readable content (all TEXT fields)
  summary: z.string().nullable().optional(),
  indicationSummary: z.string().nullable().optional(),
  sideEffectsSummary: z.string().nullable().optional(),
  dosageSummary: z.string().nullable().optional(),
  warningsSummary: z.string().nullable().optional(),
  contraindicationsSummary: z.string().nullable().optional(),

  // Enhanced content sections
  aiGeneratedFaqs: z
    .array(
      z.object({
        question: z.string().min(1, 'Question cannot be empty'),
        answer: z.string().min(1, 'Answer cannot be empty'),
      }),
    )
    .nullable()
    .optional(),
  relatedDrugs: z.array(z.string()).nullable().optional(),
  relatedConditions: z.array(z.string()).nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),

  // Content quality metrics with exact constraints
  aiModelVersion: z
    .string()
    .max(50, 'AI model version must be 50 characters or less')
    .nullable()
    .optional(),
  promptVersion: z
    .string()
    .max(20, 'Prompt version must be 20 characters or less')
    .nullable()
    .optional(),
  confidenceScore: z
    .number()
    .min(0, 'Confidence score must be between 0 and 1')
    .max(1, 'Confidence score must be between 0 and 1')
    .nullable()
    .optional(), // decimal(3,2) in TypeORM
  contentHash: z.string().nullable().optional(), // TEXT field

  // Content flags
  isReviewed: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  reviewedBy: z.string().nullable().optional(),
  reviewedAt: z.date().nullable().optional(),

  // Timestamps (auto-generated)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Related Drug Entity Schema (based on related-drug.entity.ts)
export const RelatedDrugEntitySchema = z.object({
  id: z.number().int().positive().optional(), // Auto-generated
  sourceDrugId: z.number().int().positive(),

  // Required fields
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),

  // Optional drug information (with length constraints)
  ndc: z.string().max(20, 'NDC must be 20 characters or less').nullable().optional(),
  brandName: z.string().max(200, 'Brand name must be 200 characters or less').nullable().optional(),
  genericName: z
    .string()
    .max(200, 'Generic name must be 200 characters or less')
    .nullable()
    .optional(),
  manufacturer: z
    .string()
    .max(200, 'Manufacturer must be 200 characters or less')
    .nullable()
    .optional(),

  // Content fields (TEXT type)
  indication: z.string().nullable().optional(),
  description: z.string().nullable().optional(),

  // Relationship metadata
  confidenceScore: z
    .number()
    .min(0, 'Confidence score must be between 0 and 1')
    .max(1, 'Confidence score must be between 0 and 1')
    .nullable()
    .optional(), // decimal(3,2)
  relationshipType: z
    .string()
    .max(50, 'Relationship type must be 50 characters or less')
    .nullable()
    .optional(),
  metadata: z.record(z.any()).nullable().optional(), // JSONB field

  // Timestamps (auto-generated)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Create Drug DTO Schema (for API validation)
export const CreateDrugDtoSchema = DrugEntitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Drug DTO Schema (for API validation)
export const UpdateDrugDtoSchema = CreateDrugDtoSchema.partial();

// Create Related Drug DTO Schema (for API validation)
export const CreateRelatedDrugDtoSchema = RelatedDrugEntitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Ensure required fields are explicitly required
  sourceDrugId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
});

// Update Related Drug DTO Schema (for API validation)
export const UpdateRelatedDrugDtoSchema = CreateRelatedDrugDtoSchema.partial().omit({
  sourceDrugId: true, // Cannot update the source drug reference
});

// Drug Enrichment Creation Schema
export const CreateDrugEnrichmentDtoSchema = DrugEnrichmentEntitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  drugId: z.number().int().positive(),
});

// Drug Enrichment Update Schema
export const UpdateDrugEnrichmentDtoSchema = CreateDrugEnrichmentDtoSchema.partial().omit({
  drugId: true,
});

// Enhanced NDC Validation Schema
export const NDCSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= 4, 'NDC must be at least 4 characters')
  .refine((value) => value.length <= 20, 'NDC must be 20 characters or less')
  .refine((value) => /^[0-9\-]+$/.test(value), 'NDC must contain only numbers and hyphens')
  .refine((value) => {
    // NDC format validation: should be in format like 12345-678-90 or 1234-567-89
    const parts = value.split('-');
    return parts.length >= 2 && parts.length <= 3 && parts.every((part) => part.length > 0);
  }, 'NDC must be in valid format (e.g., 12345-678 or 1234-567-89)');

// Enhanced Identifier Validation Schema
export const IdentifierTypeEnum = z.enum([
  'ndc',
  'upc',
  'rxcui',
  'unii',
  'generic_name',
  'brand_name',
]);

export const DrugIdentifierSchema = z
  .object({
    type: IdentifierTypeEnum,
    value: z
      .string()
      .min(1, 'Identifier value cannot be empty')
      .max(100, 'Identifier value too long')
      .transform((value) => value.trim()),
  })
  .refine(
    (data) => {
      // Enhanced validation based on identifier type
      switch (data.type) {
        case 'ndc':
          return NDCSchema.safeParse(data.value).success;
        case 'upc':
          return /^[0-9]{12}$/.test(data.value); // UPC is 12 digits
        case 'rxcui':
          return /^[0-9]+$/.test(data.value); // RxCUI is numeric
        case 'unii':
          return /^[A-Z0-9]{10}$/.test(data.value); // UNII is 10 alphanumeric characters
        case 'generic_name':
        case 'brand_name':
          return data.value.length >= 2 && data.value.length <= 255; // Names should be reasonable length
        default:
          return false;
      }
    },
    (data) => ({
      message: `Invalid ${data.type.toUpperCase()} format: ${data.value}`,
      path: ['value'],
    }),
  );

// Enrichment Request Schema with enhanced validation
export const EnrichmentRequestSchema = z.object({
  identifiers: z
    .array(DrugIdentifierSchema)
    .min(1, 'At least one identifier is required')
    .max(10, 'Maximum 10 identifiers allowed')
    .refine((identifiers) => {
      // Ensure no duplicate identifier values
      const values = identifiers.map((id) => `${id.type}:${id.value}`);
      return new Set(values).size === values.length;
    }, 'Duplicate identifiers are not allowed'),
  context: z
    .string()
    .max(1000, 'Context must be 1000 characters or less')
    .transform((value) => value?.trim())
    .optional(),
  includeConfidence: z.boolean().default(true),
  validateIdentifiers: z.boolean().default(true),
});

// FDA Label Validation Schema
export const FDALabelSchema = z.object({
  set_id: z.string().min(1, 'Set ID is required'),
  id: z.string().min(1, 'ID is required'),
  effective_time: z.string().optional(),
  openfda: z.object({
    brand_name: z.array(z.string()).optional(),
    generic_name: z.array(z.string()).optional(),
    manufacturer_name: z.array(z.string()).optional(),
    product_ndc: z.array(z.string()).optional(),
    package_ndc: z.array(z.string()).optional(),
    substance_name: z.array(z.string()).optional(),
    product_type: z.array(z.string()).optional(),
    route: z.array(z.string()).optional(),
    spl_id: z.array(z.string()).optional(),
    spl_set_id: z.array(z.string()).optional(),
    is_original_packager: z.array(z.boolean()).optional(),
    upc: z.array(z.string()).optional(),
    unii: z.array(z.string()).optional(),
  }),
  indications_and_usage: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  dosage_and_administration: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  adverse_reactions: z.array(z.string()).optional(),
  active_ingredient: z.array(z.string()).optional(),
  inactive_ingredient: z.array(z.string()).optional(),
  purpose: z.array(z.string()).optional(),
  drug_interactions: z.array(z.string()).optional(),
  overdosage: z.array(z.string()).optional(),
  clinical_pharmacology: z.array(z.string()).optional(),
  description: z.array(z.string()).optional(),
  mechanism_of_action: z.array(z.string()).optional(),
  pharmacokinetics: z.array(z.string()).optional(),
  nonclinical_toxicology: z.array(z.string()).optional(),
  clinical_studies: z.array(z.string()).optional(),
  how_supplied: z.array(z.string()).optional(),
  patient_counseling_information: z.array(z.string()).optional(),
});

// MCP Tool Parameter Schemas
export const FetchFDADrugDataSchema = z.object({
  ndc: NDCSchema,
  includeEnrichment: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(5).default(3),
});

// Response Schemas
export const DrugSearchResultSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  genericName: z.string().optional(),
  manufacturer: z.string(),
  ndc: z.string(),
  source: z.enum(['fda', 'local']),
});

// Relationship Validation Schemas
export const DrugWithEnrichmentSchema = DrugEntitySchema.extend({
  enrichment: DrugEnrichmentEntitySchema.optional(),
});

export const DrugEnrichmentWithDrugSchema = DrugEnrichmentEntitySchema.extend({
  drug: DrugEntitySchema,
});

export const DrugWithRelatedDrugsSchema = DrugEntitySchema.extend({
  relatedDrugs: z.array(RelatedDrugEntitySchema).optional(),
});

export const RelatedDrugWithSourceSchema = RelatedDrugEntitySchema.extend({
  sourceDrug: DrugEntitySchema,
});

// Comprehensive Drug with all relationships
export const FullDrugSchema = DrugEntitySchema.extend({
  enrichment: DrugEnrichmentEntitySchema.optional(),
  relatedDrugs: z.array(RelatedDrugEntitySchema).optional(),
});

// Validation for ensuring relationship consistency
export const RelationshipValidationSchema = z
  .object({
    drugId: z.number().int().positive(),
    enrichmentDrugId: z.number().int().positive(),
  })
  .refine((data) => data.drugId === data.enrichmentDrugId, {
    message: 'Drug ID and enrichment drug ID must match',
    path: ['enrichmentDrugId'],
  });

export const RelatedDrugRelationshipValidationSchema = z
  .object({
    sourceDrugId: z.number().int().positive(),
    relatedDrugSourceDrugId: z.number().int().positive(),
  })
  .refine((data) => data.sourceDrugId === data.relatedDrugSourceDrugId, {
    message: 'Source drug ID and related drug source drug ID must match',
    path: ['relatedDrugSourceDrugId'],
  });

// Export commonly used types
export type DrugEntity = z.infer<typeof DrugEntitySchema>;
export type DrugEnrichmentEntity = z.infer<typeof DrugEnrichmentEntitySchema>;
export type RelatedDrugEntity = z.infer<typeof RelatedDrugEntitySchema>;
export type DrugWithEnrichment = z.infer<typeof DrugWithEnrichmentSchema>;
export type DrugEnrichmentWithDrug = z.infer<typeof DrugEnrichmentWithDrugSchema>;
export type DrugWithRelatedDrugs = z.infer<typeof DrugWithRelatedDrugsSchema>;
export type RelatedDrugWithSource = z.infer<typeof RelatedDrugWithSourceSchema>;
export type FullDrug = z.infer<typeof FullDrugSchema>;
export type CreateDrugDto = z.infer<typeof CreateDrugDtoSchema>;
export type UpdateDrugDto = z.infer<typeof UpdateDrugDtoSchema>;
export type CreateRelatedDrugDto = z.infer<typeof CreateRelatedDrugDtoSchema>;
export type UpdateRelatedDrugDto = z.infer<typeof UpdateRelatedDrugDtoSchema>;
export type CreateDrugEnrichmentDto = z.infer<typeof CreateDrugEnrichmentDtoSchema>;
export type UpdateDrugEnrichmentDto = z.infer<typeof UpdateDrugEnrichmentDtoSchema>;
export type EnrichmentRequest = z.infer<typeof EnrichmentRequestSchema>;
export type DrugIdentifier = z.infer<typeof DrugIdentifierSchema>;
export type FDALabel = z.infer<typeof FDALabelSchema>;
export type FetchFDADrugData = z.infer<typeof FetchFDADrugDataSchema>;
export type DrugSearchResult = z.infer<typeof DrugSearchResultSchema>;
export type RelationshipValidation = z.infer<typeof RelationshipValidationSchema>;
export type RelatedDrugRelationshipValidation = z.infer<
  typeof RelatedDrugRelationshipValidationSchema
>;
