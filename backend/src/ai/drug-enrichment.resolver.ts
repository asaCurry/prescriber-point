import { Resolver, Tool } from '@nestjs-mcp/server';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { EnrichmentMcpService } from './services/enrichment-mcp.service';
import { IdentifierType } from './dto/enrichment-request.dto';
import { FdaService } from '../fda/fda.service';
import { NDCSchema } from '../common/schemas/entity-schemas';
import { AIServiceException } from './exceptions/ai-service.exceptions';
import { AIValidationMiddleware } from './middleware/validation.middleware';

// Legacy schema for backward compatibility - simplified for MCP compatibility
const LegacyDrugDataSchema = {
  brandName: z.string().optional(),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  indications: z.string().optional(),
  warnings: z.string().optional(),
  dosage: z.string().optional(),
  contraindications: z.string().optional(),
  ndc: z.string().optional(),
};

// Related drug data interface for MCP tools
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

@Resolver()
export class DrugEnrichmentResolver {
  private readonly logger = new Logger(DrugEnrichmentResolver.name);
  private readonly validationMiddleware = new AIValidationMiddleware();

  constructor(
    private readonly enrichmentService: EnrichmentMcpService,
    private readonly fdaService: FdaService,
  ) {}

  @Tool({
    name: 'enrich_drugs_batch',
    description:
      'Enriches multiple drug identifiers (NDC, brand names, generic names, etc.) with AI-generated content and validation',
    paramsSchema: {
      identifiers: z
        .array(
          z.object({
            type: z.enum(['ndc', 'upc', 'rxcui', 'unii', 'generic_name', 'brand_name']),
            value: z.string().min(1, 'Identifier value cannot be empty'),
          }),
        )
        .min(1, 'At least one identifier is required')
        .max(10, 'Maximum 10 identifiers allowed'),
      context: z.string().optional(),
      includeConfidence: z.boolean().default(true),
      validateIdentifiers: z.boolean().default(true),
    },
  })
  async enrichDrugsBatch(args: {
    identifiers: Array<{ type: string; value: string }>;
    context?: string;
    includeConfidence?: boolean;
    validateIdentifiers?: boolean;
  }) {
    try {
      const request = {
        identifiers: args.identifiers.map((id) => ({
          type: id.type as IdentifierType,
          value: id.value,
        })),
        context: args.context,
        includeConfidence: args.includeConfidence,
        validateIdentifiers: args.validateIdentifiers,
      };

      const batchResult = await this.enrichmentService.enrichMultipleDrugs(request);

      // Format results for MCP response
      const successCount = batchResult.results.filter((r) => r.status === 'success').length;
      const errorCount = batchResult.totalErrors;
      const validationErrors = batchResult.validationResult.errorCount;

      let responseText = `# Drug Enrichment Batch Results\n\n`;
      responseText += `**Request ID:** ${batchResult.requestId}\n`;
      responseText += `**Processing Time:** ${batchResult.summary.processingTimeMs}ms\n`;
      responseText += `**Success Rate:** ${(batchResult.summary.successRate * 100).toFixed(1)}%\n`;
      responseText += `**Results:** ${successCount} successful, ${errorCount} errors, ${validationErrors} validation errors\n\n`;

      if (batchResult.validationResult.errorCount > 0) {
        responseText += `## Validation Errors\n\n`;
        for (const error of batchResult.validationResult.errors) {
          responseText += `**${error.identifier.type.toUpperCase()}: ${error.identifier.value}**\n`;
          responseText += `Error: ${error.message}\n`;
          if (error.suggestions && error.suggestions.length > 0) {
            responseText += `Suggestions:\n`;
            for (const suggestion of error.suggestions) {
              responseText += `- ${suggestion}\n`;
            }
          }
          responseText += `\n`;
        }
      }

      if (successCount > 0) {
        responseText += `## Successful Enrichments\n\n`;
        for (const result of batchResult.results) {
          if (result.status === 'success' && result.data) {
            responseText += `### ${result.identifier.type.toUpperCase()}: ${result.identifier.value}\n\n`;
            responseText += `**Title:** ${result.data.title}\n`;
            responseText += `**Summary:** ${result.data.summary}\n`;
            if (args.includeConfidence) {
              responseText += `**Confidence Score:** ${(result.data.confidenceScore * 100).toFixed(1)}%\n`;
            }
            responseText += `**Data Source:** ${result.dataSource}\n`;
            responseText += `**Processing Time:** ${result.processingTimeMs}ms\n\n`;
          }
        }
      }

      if (errorCount > 0) {
        responseText += `## Processing Errors\n\n`;
        for (const result of batchResult.results) {
          if (result.status === 'error' && result.error) {
            responseText += `**${result.identifier.type.toUpperCase()}: ${result.identifier.value}**\n`;
            responseText += `Error: ${result.error.message}\n`;
            responseText += `Type: ${result.error.type}\n\n`;
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Batch enrichment failed: ${error.message}\n\nPlease check your input format and try again.`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'validate_drug_identifiers',
    description:
      'Validates drug identifiers (NDC, UPC, RXCUI, UNII) format and provides suggestions for corrections',
    paramsSchema: {
      identifiers: z
        .array(
          z.object({
            type: z.enum(['ndc', 'upc', 'rxcui', 'unii', 'generic_name', 'brand_name']),
            value: z.string().min(1, 'Identifier value cannot be empty'),
          }),
        )
        .min(1)
        .max(20),
    },
  })
  async validateDrugIdentifiers(args: { identifiers: Array<{ type: string; value: string }> }) {
    try {
      const identifiers = args.identifiers.map((id) => ({
        type: id.type as IdentifierType,
        value: id.value,
      }));

      const validationResult =
        await this.enrichmentService['validationService'].validateIdentifiers(identifiers);

      let responseText = `# Drug Identifier Validation Results\n\n`;
      responseText += `**Total Identifiers:** ${identifiers.length}\n`;
      responseText += `**Valid:** ${validationResult.validIdentifiers.length}\n`;
      responseText += `**Errors:** ${validationResult.errorCount}\n`;
      responseText += `**Warnings:** ${validationResult.warningCount}\n\n`;

      if (validationResult.validIdentifiers.length > 0) {
        responseText += `## Valid Identifiers ✅\n\n`;
        for (const identifier of validationResult.validIdentifiers) {
          responseText += `- **${identifier.type.toUpperCase()}:** ${identifier.value}\n`;
        }
        responseText += `\n`;
      }

      if (validationResult.errors.length > 0) {
        responseText += `## Validation Errors ❌\n\n`;
        for (const error of validationResult.errors) {
          responseText += `### ${error.identifier.type.toUpperCase()}: ${error.identifier.value}\n`;
          responseText += `**Error:** ${error.message}\n`;
          if (error.suggestions && error.suggestions.length > 0) {
            responseText += `**Suggestions:**\n`;
            for (const suggestion of error.suggestions) {
              responseText += `- ${suggestion}\n`;
            }
          }
          responseText += `\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Legacy tool for backward compatibility
  @Tool({
    name: 'enrich_drug_data',
    description:
      '[LEGACY] Enriches FDA drug label data with AI-generated SEO content for healthcare professionals. Use enrich_drugs_batch for new implementations.',
    paramsSchema: LegacyDrugDataSchema,
  })
  async enrichDrugDataLegacy(args: {
    brandName?: string;
    genericName?: string;
    manufacturer?: string;
    indications?: string;
    warnings?: string;
    dosage?: string;
    contraindications?: string;
    ndc?: string;
  }) {
    try {
      // Convert legacy format to new identifier format
      const identifiers = [];

      if (args.ndc) {
        identifiers.push({ type: IdentifierType.NDC, value: args.ndc });
      }
      if (args.brandName) {
        identifiers.push({ type: IdentifierType.BRAND_NAME, value: args.brandName });
      }
      if (args.genericName) {
        identifiers.push({ type: IdentifierType.GENERIC_NAME, value: args.genericName });
      }

      if (identifiers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No valid identifiers provided. Please provide at least one of: ndc, brandName, or genericName.',
            },
          ],
          isError: true,
        };
      }

      const request = {
        identifiers,
        context: [args.indications, args.warnings, args.dosage, args.contraindications]
          .filter(Boolean)
          .join('. '),
        includeConfidence: true,
        validateIdentifiers: true,
      };

      const batchResult = await this.enrichmentService.enrichMultipleDrugs(request);
      const firstResult = batchResult.results[0];

      if (firstResult?.status === 'success' && firstResult.data) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(firstResult.data, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Error enriching drug data: ${firstResult?.error?.message || 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error enriching drug data: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'fetch_fda_drug_data',
    description:
      'Fetches drug data from FDA API by NDC with comprehensive validation, fallbacks, and error handling',
    paramsSchema: {
      ndc: z.string().min(4, 'NDC must be at least 4 characters').max(20, 'NDC too long'),
      includeEnrichment: z.boolean().default(true),
      maxRetries: z.number().min(0).max(5).default(3),
    },
  })
  async fetchFdaDrugData(args: { ndc: string; includeEnrichment?: boolean; maxRetries?: number }) {
    try {
      // Enhanced NDC validation using our schema
      const ndcValidation = NDCSchema.safeParse(args.ndc);

      if (!ndcValidation.success) {
        const errorMessages = ndcValidation.error.errors.map((err) => err.message).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `❌ Invalid NDC format: "${args.ndc}". ${errorMessages}`,
            },
          ],
          isError: true,
        };
      }

      const sanitizedNDC = ndcValidation.data;

      let responseText = `# FDA Drug Data Fetch Results\n\n`;
      responseText += `**NDC:** ${sanitizedNDC}\n`;
      responseText += `**Include Enrichment:** ${args.includeEnrichment ? 'Yes' : 'No'}\n`;
      responseText += `**Max Retries:** ${args.maxRetries || 3}\n\n`;

      // Attempt to fetch from FDA API with retries
      let fdaData = null;
      let attempt = 0;
      const maxRetries = args.maxRetries || 3;

      while (attempt <= maxRetries && !fdaData) {
        try {
          responseText += `**Attempt ${attempt + 1}:** `;

          if (attempt === 0) {
            // First attempt: exact NDC match
            fdaData = await this.fdaService.getDrugByNDC(sanitizedNDC);
            responseText += `Exact NDC match - ${fdaData ? 'Success ✅' : 'No results'}\n`;
          } else if (attempt === 1) {
            // Second attempt: search by formatted NDC (add hyphens if missing)
            const formattedNDC = this.formatNDC(sanitizedNDC);
            fdaData = await this.fdaService.getDrugByNDC(formattedNDC);
            responseText += `Formatted NDC (${formattedNDC}) - ${fdaData ? 'Success ✅' : 'No results'}\n`;
          } else {
            // Additional attempts: partial NDC searches
            const partialNDC = sanitizedNDC.split('-')[0]; // Get first part of NDC
            const searchResults = await this.fdaService.searchDrugs(partialNDC);
            if (searchResults.length > 0) {
              fdaData =
                searchResults.find((result) => result.ndc.includes(sanitizedNDC)) ||
                searchResults[0];
              responseText += `Partial NDC search (${partialNDC}) - ${fdaData ? 'Success ✅' : 'No results'}\n`;
            } else {
              responseText += `Partial NDC search (${partialNDC}) - No results\n`;
            }
          }

          attempt++;
        } catch (error) {
          responseText += `Failed - ${error.message}\n`;
          attempt++;
          if (attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }

      if (!fdaData) {
        responseText += `\n❌ **Result:** No FDA data found after ${maxRetries + 1} attempts\n\n`;
        responseText += `**Troubleshooting Suggestions:**\n`;
        responseText += `- Verify NDC format (e.g., "0071-0155-23" or "00710155")\n`;
        responseText += `- Check if drug is in FDA database\n`;
        responseText += `- Try searching by brand name instead\n`;

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
          isError: false, // Not an error, just no data found
        };
      }

      responseText += `\n✅ **Result:** FDA data successfully retrieved\n\n`;
      responseText += `**Brand Name:** ${fdaData.brandName}\n`;
      responseText += `**Generic Name:** ${fdaData.genericName || 'N/A'}\n`;
      responseText += `**Manufacturer:** ${fdaData.manufacturer}\n`;
      responseText += `**NDC:** ${fdaData.ndc}\n`;
      responseText += `**Data Source:** ${fdaData.dataSource}\n\n`;

      // If enrichment is requested, enrich the data
      let enrichmentData = null;
      if (args.includeEnrichment) {
        try {
          responseText += `## AI Enrichment Process\n\n`;

          const enrichmentRequest = {
            identifiers: [{ type: IdentifierType.NDC, value: sanitizedNDC }],
            context: `Brand: ${fdaData.brandName}, Generic: ${fdaData.genericName || 'N/A'}, Manufacturer: ${fdaData.manufacturer}`,
            includeConfidence: true,
            validateIdentifiers: false, // Already validated
          };

          const batchResult = await this.enrichmentService.enrichMultipleDrugs(enrichmentRequest);
          const enrichmentResult = batchResult.results[0];

          if (enrichmentResult?.status === 'success' && enrichmentResult.data) {
            enrichmentData = enrichmentResult.data;
            responseText += `✅ **Enrichment Status:** Success\n`;
            responseText += `**Title:** ${enrichmentData.title}\n`;
            responseText += `**Meta Description:** ${enrichmentData.metaDescription}\n`;
            responseText += `**Summary:** ${enrichmentData.summary}\n`;
            responseText += `**Confidence Score:** ${(enrichmentData.confidenceScore * 100).toFixed(1)}%\n`;
            responseText += `**FAQs Generated:** ${enrichmentData.aiGeneratedFaqs?.length || 0}\n\n`;
          } else {
            responseText += `⚠️ **Enrichment Status:** Failed - ${enrichmentResult?.error?.message || 'Unknown error'}\n\n`;
          }
        } catch (enrichmentError) {
          responseText += `⚠️ **Enrichment Status:** Error - ${enrichmentError.message}\n\n`;
        }
      }

      // Return comprehensive data
      const resultData = {
        fdaData,
        enrichmentData,
        metadata: {
          ndc: sanitizedNDC,
          attempts: attempt,
          timestamp: new Date().toISOString(),
          enrichmentIncluded: args.includeEnrichment,
        },
      };

      responseText += `## Complete Data Package\n\n`;
      responseText += `\`\`\`json\n${JSON.stringify(resultData, null, 2)}\n\`\`\`\n`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ FDA data fetch failed: ${error.message}\n\nPlease check the NDC format and try again.`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'find_related_drugs',
    description:
      'Finds 3-5 related drugs with their NDC codes based on a source drug. Uses AI to identify drugs with similar indications, same therapeutic class, or alternative treatments.',
    paramsSchema: {
      sourceDrugIdentifier: z.object({
        type: z.enum(['ndc', 'brand_name', 'generic_name']),
        value: z.string().min(1, 'Drug identifier cannot be empty'),
      }),
      maxResults: z.number().min(3).max(5).default(5),
      relationshipTypes: z
        .array(z.enum(['similar_indication', 'same_class', 'alternative', 'generic_equivalent']))
        .optional(),
      includeConfidence: z.boolean().default(true),
    },
  })
  async findRelatedDrugs(args: {
    sourceDrugIdentifier: { type: string; value: string };
    maxResults?: number;
    relationshipTypes?: string[];
    includeConfidence?: boolean;
  }) {
    try {
      const maxResults = args.maxResults || 5;
      const relationshipTypes = args.relationshipTypes || [
        'similar_indication',
        'same_class',
        'alternative',
      ];

      let responseText = `# Related Drugs Analysis\n\n`;
      responseText += `**Source Drug:** ${args.sourceDrugIdentifier.type.toUpperCase()}: ${args.sourceDrugIdentifier.value}\n`;
      responseText += `**Max Results:** ${maxResults}\n`;
      responseText += `**Relationship Types:** ${relationshipTypes.join(', ')}\n\n`;

      // Step 1: Get source drug data
      const sourceDrugRequest = {
        identifiers: [
          {
            type: args.sourceDrugIdentifier.type as IdentifierType,
            value: args.sourceDrugIdentifier.value,
          },
        ],
        includeConfidence: true,
        validateIdentifiers: true,
      };

      const sourceDrugResult = await this.enrichmentService.enrichMultipleDrugs(sourceDrugRequest);
      const sourceDrug = sourceDrugResult.results[0];

      if (!sourceDrug || sourceDrug.status !== 'success' || !sourceDrug.data) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Could not find source drug data for ${args.sourceDrugIdentifier.type}: ${args.sourceDrugIdentifier.value}`,
            },
          ],
          isError: true,
        };
      }

      responseText += `## Source Drug Information\n\n`;
      responseText += `**Brand Name:** ${sourceDrug.data.title}\n`;
      responseText += `**Summary:** ${sourceDrug.data.summary}\n`;
      if (args.includeConfidence) {
        responseText += `**Confidence Score:** ${(sourceDrug.data.confidenceScore * 100).toFixed(1)}%\n`;
      }
      responseText += `\n`;

      // Step 2: Use AI to find related drugs
      // For now, we'll simulate the AI response with structured data
      // In a real implementation, this would call the AI service
      const relatedDrugs = await this.generateRelatedDrugs(sourceDrug.data, maxResults);

      responseText += `## Related Drugs Found\n\n`;
      responseText += `**Total Found:** ${relatedDrugs.length}\n\n`;

      for (let i = 0; i < relatedDrugs.length; i++) {
        const drug = relatedDrugs[i];
        responseText += `### ${i + 1}. ${drug.name}\n\n`;
        responseText += `**NDC:** ${drug.ndc || 'Not available'}\n`;
        responseText += `**Brand Name:** ${drug.brandName || 'N/A'}\n`;
        responseText += `**Generic Name:** ${drug.genericName || 'N/A'}\n`;
        responseText += `**Manufacturer:** ${drug.manufacturer || 'N/A'}\n`;
        responseText += `**Relationship:** ${drug.relationshipType}\n`;
        responseText += `**Indication:** ${drug.indication || 'N/A'}\n`;
        responseText += `**Description:** ${drug.description || 'N/A'}\n`;
        if (args.includeConfidence && drug.confidenceScore) {
          responseText += `**Confidence Score:** ${(drug.confidenceScore * 100).toFixed(1)}%\n`;
        }
        responseText += `\n`;
      }

      // Return structured data for potential saving
      const resultData = {
        sourceDrug: {
          identifier: args.sourceDrugIdentifier,
          data: sourceDrug.data,
        },
        relatedDrugs,
        metadata: {
          maxResults,
          relationshipTypes,
          timestamp: new Date().toISOString(),
          totalFound: relatedDrugs.length,
        },
      };

      responseText += `## Complete Data Package\n\n`;
      responseText += `\`\`\`json\n${JSON.stringify(resultData, null, 2)}\n\`\`\`\n`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Related drugs analysis failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private buildRelatedDrugsPrompt(
    sourceDrugData: any,
    maxResults: number,
    relationshipTypes: string[],
  ): string {
    const brandName = sourceDrugData.title || 'Unknown Drug';
    const summary = sourceDrugData.summary || '';
    const indications = sourceDrugData.indicationSummary || 'N/A';
    const keywords = sourceDrugData.keywords?.join(', ') || 'N/A';
    const sideEffects = sourceDrugData.sideEffectsSummary || 'N/A';
    const dosage = sourceDrugData.dosageSummary || 'N/A';
    const warnings = sourceDrugData.warningsSummary || 'N/A';

    return `You are a clinical pharmacist and drug information specialist. Your task is to identify ${maxResults} clinically relevant related medications for healthcare professionals.

**SOURCE MEDICATION ANALYSIS:**
- Brand Name: ${brandName}
- Clinical Summary: ${summary}
- Primary Indications: ${indications}
- Therapeutic Class/Keywords: ${keywords}
- Side Effects Profile: ${sideEffects}
- Dosing Information: ${dosage}
- Safety Warnings: ${warnings}

**RELATIONSHIP CATEGORIES TO CONSIDER:**
${relationshipTypes
  .map((type) => {
    const descriptions = {
      similar_indication: 'Drugs treating the same or overlapping medical conditions',
      same_class: 'Drugs in the same pharmacological/therapeutic class',
      alternative: 'Alternative treatment options with different mechanisms',
      generic_equivalent: 'Generic versions or bioequivalent formulations',
    };
    return `- ${type}: ${descriptions[type] || type}`;
  })
  .join('\n')}

**CLINICAL REQUIREMENTS:**
1. Prioritize drugs commonly prescribed in clinical practice
2. Include both brand and generic names when available
3. Focus on FDA-approved medications with established safety profiles
4. Consider drug interactions, contraindications, and patient populations
5. Provide clinically relevant relationship descriptions
6. Include confidence scores based on clinical evidence strength

**OUTPUT SPECIFICATIONS:**
Return a JSON array with exactly ${maxResults} entries. Each entry must include:

{
  "name": "Primary drug name (generic preferred)",
  "ndc": "National Drug Code (if available)",
  "brandName": "Brand/trade name",
  "genericName": "Generic/international name",
  "manufacturer": "Pharmaceutical company",
  "indication": "Primary FDA-approved indication",
  "description": "Clinical relationship explanation (2-3 sentences)",
  "relationshipType": "one of: ${relationshipTypes.join('|')}",
  "confidenceScore": 0.0-1.0
}

**CLINICAL FOCUS AREAS:**
- Cardiovascular medications (statins, ACE inhibitors, beta-blockers)
- Diabetes management (metformin, insulin, SGLT2 inhibitors)
- Pain management (NSAIDs, opioids, gabapentinoids)
- Mental health (SSRIs, benzodiazepines, mood stabilizers)
- Infectious disease (antibiotics, antivirals, antifungals)
- Gastrointestinal (PPIs, H2 blockers, prokinetics)

**QUALITY STANDARDS:**
- Use only FDA-approved medications
- Include real NDC codes when possible
- Provide evidence-based relationship descriptions
- Ensure clinical accuracy and relevance
- Focus on commonly prescribed medications

Generate clinically relevant related drugs that would be useful for healthcare professionals making prescribing decisions.`;
  }

  private async generateRelatedDrugs(sourceDrugData: any, maxResults: number): Promise<any[]> {
    try {
      // Use AI service to generate related drugs based on the source drug data
      const prompt = this.buildRelatedDrugsPrompt(sourceDrugData, maxResults, [
        'similar_indication',
        'same_class',
        'alternative',
        'generic_equivalent',
      ]);

      // Check if AI service is available
      if (!process.env.ANTHROPIC_API_KEY) {
        this.logger.warn('ANTHROPIC_API_KEY not set, returning empty related drugs');
        return [];
      }

      // Call AI service to generate related drugs
      const aiService = this.enrichmentService['aiService'];
      if (!aiService) {
        this.logger.warn('AI service not available, returning empty related drugs');
        return [];
      }

      // Use the AI service to generate related drugs
      const relatedDrugs = await aiService.generateRelatedDrugs(prompt, maxResults);

      if (relatedDrugs && relatedDrugs.length > 0) {
        this.logger.log(`AI generated ${relatedDrugs.length} related drugs`);
        return relatedDrugs.slice(0, maxResults);
      } else {
        this.logger.warn('AI service returned no related drugs, returning empty array');
        return [];
      }
    } catch (error) {
      this.logger.error('Error generating related drugs with AI:', error);
      return [];
    }
  }

  @Tool({
    name: 'save_related_drugs',
    description:
      'Prepares related drugs data for saving to database. Returns structured data that can be saved by the calling service.',
    paramsSchema: {
      sourceDrugId: z.number().int().positive('Source drug ID must be a positive integer'),
      relatedDrugs: z
        .array(
          z.object({
            name: z.string().min(1, 'Drug name cannot be empty'),
            ndc: z.string().optional(),
            brandName: z.string().optional(),
            genericName: z.string().optional(),
            manufacturer: z.string().optional(),
            indication: z.string().optional(),
            description: z.string().optional(),
            relationshipType: z.string().optional(),
            confidenceScore: z.number().min(0).max(1).optional(),
            metadata: z.any().optional(),
          }),
        )
        .min(1, 'At least one related drug is required'),
    },
  })
  async saveRelatedDrugs(args: { sourceDrugId: number; relatedDrugs: RelatedDrugData[] }) {
    try {
      let responseText = `# Related Drugs Save Results\n\n`;
      responseText += `**Source Drug ID:** ${args.sourceDrugId}\n`;
      responseText += `**Related Drugs Count:** ${args.relatedDrugs.length}\n\n`;

      responseText += `✅ **Status:** Data prepared for saving ${args.relatedDrugs.length} related drugs\n\n`;

      responseText += `## Related Drugs Data\n\n`;
      for (let i = 0; i < args.relatedDrugs.length; i++) {
        const drug = args.relatedDrugs[i];
        responseText += `### ${i + 1}. ${drug.name}\n`;
        responseText += `**NDC:** ${drug.ndc || 'N/A'}\n`;
        responseText += `**Brand Name:** ${drug.brandName || 'N/A'}\n`;
        responseText += `**Generic Name:** ${drug.genericName || 'N/A'}\n`;
        responseText += `**Manufacturer:** ${drug.manufacturer || 'N/A'}\n`;
        responseText += `**Relationship:** ${drug.relationshipType || 'N/A'}\n`;
        responseText += `**Confidence Score:** ${drug.confidenceScore ? (drug.confidenceScore * 100).toFixed(1) + '%' : 'N/A'}\n\n`;
      }

      // Return structured data for the calling service to save
      const resultData = {
        sourceDrugId: args.sourceDrugId,
        relatedDrugs: args.relatedDrugs,
        metadata: {
          preparedAt: new Date().toISOString(),
          totalCount: args.relatedDrugs.length,
        },
      };

      responseText += `## Complete Data Package\n\n`;
      responseText += `\`\`\`json\n${JSON.stringify(resultData, null, 2)}\n\`\`\`\n`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return this.handleMCPError(error, { operation: 'save_related_drugs' });
    }
  }

  @Tool({
    name: 'get_related_drugs',
    description:
      'Retrieves related drugs for a source drug from the database. Returns previously saved related drugs data.',
    paramsSchema: {
      sourceDrugId: z.number().int().positive('Source drug ID must be a positive integer'),
    },
  })
  async getRelatedDrugs(args: { sourceDrugId: number }) {
    try {
      let responseText = `# Related Drugs Retrieval Results\n\n`;
      responseText += `**Source Drug ID:** ${args.sourceDrugId}\n\n`;

      // Note: This MCP tool cannot access the database directly
      // It should be used by services that have database access
      responseText += `❌ **Status:** MCP tool cannot access database directly\n\n`;
      responseText += `**Note:** This tool is designed to be used by backend services that have database access.\n`;
      responseText += `**Suggestion:** Use the 'find_related_drugs' tool to discover related drugs, then save them via your backend service.`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to retrieve related drugs: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'validate_related_drugs_against_fda',
    description:
      'Validates a list of drug names against the FDA API and returns only those with valid FDA matches. Useful for ensuring related drugs link to real FDA drug pages.',
    paramsSchema: {
      drugNames: z
        .array(z.string().min(1, 'Drug name cannot be empty'))
        .min(1, 'At least one drug name is required')
        .max(20, 'Maximum 20 drug names allowed'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(3)
        .describe('Maximum number of validated drugs to return'),
      retries: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe('Number of retry attempts per drug name'),
    },
  })
  async validateRelatedDrugsAgainstFDA(args: {
    drugNames: string[];
    maxResults?: number;
    retries?: number;
  }) {
    try {
      let responseText = `# FDA Related Drug Validation Results\n\n`;
      responseText += `**Input Drug Names:** ${args.drugNames.length}\n`;
      responseText += `**Max Results:** ${args.maxResults || 3}\n`;
      responseText += `**Retry Attempts:** ${args.retries || 3}\n\n`;

      const validatedDrugs = [];
      const maxRetries = args.retries || 3;
      const maxResults = args.maxResults || 3;
      const processedNames = new Set<string>();

      responseText += `## Validation Process\n\n`;

      for (const drugName of args.drugNames) {
        if (validatedDrugs.length >= maxResults) {
          responseText += `**Stopping:** Reached maximum results (${maxResults})\n\n`;
          break;
        }

        if (processedNames.has(drugName.toLowerCase())) {
          responseText += `**${drugName}:** Skipped (duplicate)\n`;
          continue;
        }
        processedNames.add(drugName.toLowerCase());

        let retryCount = 0;
        let fdaMatch = null;

        responseText += `**${drugName}:**\n`;

        while (retryCount < maxRetries && !fdaMatch) {
          try {
            responseText += `  - Attempt ${retryCount + 1}/${maxRetries}: `;

            const searchResults = await this.fdaService.searchDrugs(drugName, 1);

            if (searchResults.length > 0) {
              fdaMatch = searchResults[0];
              responseText += `✅ Found - ${fdaMatch.brandName || fdaMatch.genericName} (NDC: ${fdaMatch.ndc})\n`;
            } else {
              responseText += `❌ No FDA match\n`;
            }
          } catch (error) {
            responseText += `⚠️ Error - ${error.message}\n`;
          }

          retryCount++;

          if (retryCount < maxRetries && !fdaMatch) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        if (fdaMatch) {
          validatedDrugs.push({
            originalName: drugName,
            fdaMatch: {
              name: fdaMatch.brandName || fdaMatch.genericName,
              brandName: fdaMatch.brandName,
              genericName: fdaMatch.genericName,
              manufacturer: fdaMatch.manufacturer,
              ndc: fdaMatch.ndc,
              source: fdaMatch.source,
            },
          });
          responseText += `  **Result:** ✅ Validated and added to results\n\n`;
        } else {
          responseText += `  **Result:** ❌ Discarded - no FDA match after ${maxRetries} attempts\n\n`;
        }
      }

      responseText += `## Final Results\n\n`;
      responseText += `**Validated:** ${validatedDrugs.length}/${args.drugNames.length} drugs\n`;
      responseText += `**Success Rate:** ${((validatedDrugs.length / args.drugNames.length) * 100).toFixed(1)}%\n\n`;

      if (validatedDrugs.length > 0) {
        responseText += `### FDA-Validated Related Drugs\n\n`;
        for (let i = 0; i < validatedDrugs.length; i++) {
          const drug = validatedDrugs[i];
          responseText += `${i + 1}. **${drug.fdaMatch.name}**\n`;
          responseText += `   - Original Suggestion: "${drug.originalName}"\n`;
          responseText += `   - Brand Name: ${drug.fdaMatch.brandName || 'N/A'}\n`;
          responseText += `   - Generic Name: ${drug.fdaMatch.genericName || 'N/A'}\n`;
          responseText += `   - Manufacturer: ${drug.fdaMatch.manufacturer || 'N/A'}\n`;
          responseText += `   - NDC: ${drug.fdaMatch.ndc}\n`;
          responseText += `   - Source: ${drug.fdaMatch.source || 'FDA'}\n\n`;
        }
      } else {
        responseText += `**No drugs could be validated** - consider revising the input drug names or checking FDA API connectivity.\n\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to validate related drugs against FDA: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Enhanced error handling helper for MCP tools
   */
  private handleMCPError(error: any, context: { operation: string; correlationId?: string }) {
    // If it's already our custom exception, use its MCP response
    if (error instanceof AIServiceException) {
      return error.toMCPResponse();
    }

    // Log the error with context
    console.error(`MCP Tool Error [${context.operation}]:`, {
      error: error.message,
      stack: error.stack,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
    });

    // Create a user-friendly error response
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorId = context.correlationId || `err_${Date.now()}`;

    let suggestions: string[] = [];
    const userMessage = errorMessage;

    // Add context-specific suggestions based on error patterns
    if (errorMessage.includes('rate limit')) {
      suggestions = [
        '⏳ Please wait a moment before trying again',
        '💡 Consider reducing the number of concurrent requests',
      ];
    } else if (errorMessage.includes('not found')) {
      suggestions = [
        '🔍 Verify the drug identifier is correct',
        '💡 Try searching with a different name or NDC',
        '📝 Check for typos in the drug name',
      ];
    } else if (errorMessage.includes('timeout')) {
      suggestions = [
        '🔄 The request timed out - please try again',
        '💡 Consider breaking large requests into smaller batches',
      ];
    } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      suggestions = [
        '✅ Check the input format matches the expected schema',
        '📖 Refer to the tool documentation for correct usage',
      ];
    } else {
      suggestions = [
        '🔄 Try the request again in a few moments',
        '📧 If the problem persists, contact support with this error ID',
      ];
    }

    const responseText = `❌ **${context.operation} Failed**

**Error:** ${userMessage}

${suggestions.length > 0 ? `**Suggestions:**\n${suggestions.map((s) => `- ${s}`).join('\n')}\n` : ''}

**Error ID:** \`${errorId}\`
**Time:** ${new Date().toISOString()}

---
*If you continue to experience issues, please report this error ID to support.*`;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
      isError: true,
    };
  }

  /**
   * Validate input with enhanced error reporting
   */
  private async validateMCPInput<T>(
    schema: z.ZodSchema<T>,
    input: unknown,
    operation: string,
  ): Promise<T> {
    const correlationId = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const validationResult = await this.validationMiddleware.validateInput(schema, input, {
      operation,
      correlationId,
    });

    if (!validationResult.success) {
      throw this.validationMiddleware.createValidationException(validationResult, {
        operation,
        correlationId,
      });
    }

    return validationResult.data!;
  }

  private formatNDC(ndc: string): string {
    // Remove any existing hyphens and spaces
    const cleanNDC = ndc.replace(/[-\s]/g, '');

    // Standard NDC format is 11 digits: XXXXX-XXXX-XX or XXXX-XXXX-XX
    if (cleanNDC.length === 11) {
      // Most common format: 5-4-2
      return `${cleanNDC.slice(0, 5)}-${cleanNDC.slice(5, 9)}-${cleanNDC.slice(9)}`;
    } else if (cleanNDC.length === 10) {
      // Alternative format: 4-4-2
      return `${cleanNDC.slice(0, 4)}-${cleanNDC.slice(4, 8)}-${cleanNDC.slice(8)}`;
    }

    // Return as-is if doesn't match standard patterns
    return ndc;
  }
}
