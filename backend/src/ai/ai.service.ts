import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { FDADrugLabelResult } from '../drugs/dto/fda-label.dto';
import { AIErrorTrackingService } from './services/ai-error-tracking.service';

export interface DrugEnrichmentResult {
  title: string;
  metaDescription: string;
  slug: string;
  summary: string;
  indicationSummary?: string;
  sideEffectsSummary?: string;
  dosageSummary?: string;
  warningsSummary?: string;
  contraindicationsSummary?: string;
  aiGeneratedFaqs: Array<{ question: string; answer: string }>;
  relatedDrugs: string[];
  relatedConditions: string[];
  keywords: string[];
  structuredData: any;
  confidenceScore: number;
}

@Injectable()
export class AIService {
  private anthropic: Anthropic;

  constructor(private readonly errorTracking: AIErrorTrackingService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - AI enrichment features will be limited');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key', // Use dummy key if not set to prevent crashes
    });
  }

  async enrichDrugData(fdaData: FDADrugLabelResult): Promise<DrugEnrichmentResult> {
    const startTime = Date.now();
    const requestId = `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('AI enrichment skipped - ANTHROPIC_API_KEY not set');
      return this.createFallbackEnrichment(fdaData);
    }

    // Check if service is unhealthy
    if (this.errorTracking.isServiceUnhealthy()) {
      console.warn('AI service is unhealthy, using fallback enrichment');
      return this.createFallbackEnrichment(fdaData);
    }

    // Prepare the prompt for AI enrichment
    const enrichmentPrompt = this.buildEnrichmentPrompt(fdaData);

    try {
      // Use Anthropic SDK to call Claude for content enrichment
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3, // Lower temperature for medical content accuracy
        messages: [
          {
            role: 'user',
            content: enrichmentPrompt,
          },
        ],
      });

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';

      // Parse the AI response (assuming structured JSON response)
      const enrichedContent = this.parseAIResponse(responseText, fdaData);

      const result = {
        title: enrichedContent.title || this.generateFallbackTitle(fdaData),
        metaDescription: enrichedContent.metaDescription || '',
        slug: enrichedContent.slug || this.generateFallbackSlug(fdaData),
        summary: enrichedContent.summary || '',
        indicationSummary: enrichedContent.indicationSummary,
        sideEffectsSummary: enrichedContent.sideEffectsSummary,
        dosageSummary: enrichedContent.dosageSummary,
        warningsSummary: enrichedContent.warningsSummary,
        contraindicationsSummary: enrichedContent.contraindicationsSummary,
        aiGeneratedFaqs: enrichedContent.aiGeneratedFaqs || [],
        relatedDrugs: enrichedContent.relatedDrugs || [],
        relatedConditions: enrichedContent.relatedConditions || [],
        keywords: enrichedContent.keywords || [],
        structuredData: enrichedContent.structuredData || {},
        confidenceScore: this.calculateConfidenceScore(fdaData, enrichedContent),
      };

      // Record successful operation
      const responseTime = Date.now() - startTime;
      this.errorTracking.recordSuccess('enrichDrugData', responseTime);

      return result;
    } catch (error) {
      // Record error with detailed tracking
      const responseTime = Date.now() - startTime;
      this.errorTracking.recordError('enrichDrugData', error, requestId, {
        brandName: fdaData.openfda.brand_name?.[0],
        genericName: fdaData.openfda.generic_name?.[0],
        ndc: fdaData.openfda.product_ndc?.[0],
        responseTime,
      });

      console.error('AI enrichment failed:', error);
      // Fallback to basic enrichment
      return this.createFallbackEnrichment(fdaData);
    }
  }

  async enrichDrugDataWithClaude(fdaData: any): Promise<DrugEnrichmentResult> {
    return this.enrichDrugData(fdaData);
  }

  /**
   * Generates related drugs using AI based on source drug data
   */
  async generateRelatedDrugs(prompt: string, maxResults: number = 5): Promise<any[]> {
    const startTime = Date.now();
    const requestId = `related_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('AI related drugs generation skipped - ANTHROPIC_API_KEY not set');
      return [];
    }

    // Check if service is unhealthy
    if (this.errorTracking.isServiceUnhealthy()) {
      console.warn('AI service is unhealthy, skipping related drugs generation');
      return [];
    }

    try {
      console.log(`Generating ${maxResults} related drugs using AI...`);

      // Use Anthropic SDK to call Claude for related drugs generation
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000, // Increased for more detailed responses
        temperature: 0.1, // Very low temperature for medical accuracy
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';

      if (!responseText) {
        console.warn('AI service returned empty response');
        return [];
      }

      console.log('AI response received, parsing...');

      // Parse the AI response
      const relatedDrugs = this.parseRelatedDrugsResponse(responseText);

      if (relatedDrugs && relatedDrugs.length > 0) {
        console.log(`AI successfully generated ${relatedDrugs.length} related drugs`);

        // Record successful operation
        const responseTime = Date.now() - startTime;
        this.errorTracking.recordSuccess('generateRelatedDrugs', responseTime);

        return relatedDrugs.slice(0, maxResults);
      } else {
        console.warn('AI service returned no valid related drugs after parsing');
        console.log('Raw AI response:', responseText.substring(0, 500) + '...');

        // Record parsing failure
        const responseTime = Date.now() - startTime;
        this.errorTracking.recordError(
          'generateRelatedDrugs',
          new Error('No valid related drugs parsed from AI response'),
          requestId,
          {
            maxResults,
            responseLength: responseText.length,
            responseTime,
          },
        );

        return [];
      }
    } catch (error) {
      // Record error with detailed tracking
      const responseTime = Date.now() - startTime;
      this.errorTracking.recordError('generateRelatedDrugs', error, requestId, {
        maxResults,
        promptLength: prompt.length,
        responseTime,
      });

      console.error('AI related drugs generation failed:', error);
      if (error.message?.includes('rate_limit')) {
        console.warn('Rate limit exceeded, consider implementing backoff strategy');
      }
      return [];
    }
  }

  /**
   * Parses AI response for related drugs with enhanced validation
   */
  private parseRelatedDrugsResponse(response: string): any[] {
    try {
      console.log('Raw AI response:', response.substring(0, 500) + '...');

      // Clean the response - remove markdown formatting and extra whitespace
      let cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try to find JSON array in the response - look for complete array structure
      const jsonMatch = cleaned.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      } else {
        // If no array found, try to find any JSON structure
        const jsonObjectMatch = cleaned.match(/\{[\s\S]*?\}/);
        if (jsonObjectMatch) {
          // Wrap single object in array
          cleaned = '[' + jsonObjectMatch[0] + ']';
        }
      }

      console.log('Parsing cleaned response:', cleaned.substring(0, 200) + '...');

      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        const validatedDrugs = parsed
          .filter((drug) => this.validateRelatedDrugEntry(drug))
          .map((drug) => this.normalizeRelatedDrugEntry(drug));

        console.log(`Parsed ${validatedDrugs.length} valid related drugs from AI response`);
        return validatedDrugs;
      }

      console.warn('AI response is not a valid JSON array');
      return [];
    } catch (error) {
      console.error('Failed to parse AI related drugs response:', error);
      console.log('Raw response (first 1000 chars):', response.substring(0, 1000));

      // Try alternative parsing approaches
      try {
        // Try to extract just the JSON part more carefully
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonPart = response.substring(jsonStart, jsonEnd + 1);
          console.log(
            'Attempting to parse extracted JSON part:',
            jsonPart.substring(0, 200) + '...',
          );

          const parsed = JSON.parse(jsonPart);
          if (Array.isArray(parsed)) {
            const validatedDrugs = parsed
              .filter((drug) => this.validateRelatedDrugEntry(drug))
              .map((drug) => this.normalizeRelatedDrugEntry(drug));

            console.log(
              `Successfully parsed ${validatedDrugs.length} related drugs using fallback method`,
            );
            return validatedDrugs;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
      }

      return [];
    }
  }

  /**
   * Validates a single related drug entry from AI response
   */
  private validateRelatedDrugEntry(drug: any): boolean {
    if (!drug || typeof drug !== 'object') {
      return false;
    }

    // Must have at least a name
    if (!drug.name || typeof drug.name !== 'string' || drug.name.trim().length === 0) {
      return false;
    }

    // Validate relationship type if provided
    const validRelationshipTypes = [
      'similar_indication',
      'same_class',
      'alternative',
      'generic_equivalent',
    ];
    if (drug.relationshipType && !validRelationshipTypes.includes(drug.relationshipType)) {
      console.warn(`Invalid relationship type: ${drug.relationshipType}`);
    }

    // Validate confidence score if provided
    if (drug.confidenceScore !== undefined) {
      const score = parseFloat(drug.confidenceScore);
      if (isNaN(score) || score < 0 || score > 1) {
        console.warn(`Invalid confidence score: ${drug.confidenceScore}`);
      }
    }

    return true;
  }

  /**
   * Normalizes a related drug entry to ensure consistent format
   */
  private normalizeRelatedDrugEntry(drug: any): any {
    return {
      name: this.sanitizeText(drug.name) || 'Unknown Drug',
      ndc: this.sanitizeText(drug.ndc),
      brandName: this.sanitizeText(drug.brandName),
      genericName: this.sanitizeText(drug.genericName),
      manufacturer: this.sanitizeText(drug.manufacturer),
      indication: this.sanitizeText(drug.indication),
      description: this.sanitizeText(drug.description),
      relationshipType: this.sanitizeText(drug.relationshipType) || 'similar_indication',
      confidenceScore: this.normalizeConfidenceScore(drug.confidenceScore),
    };
  }

  /**
   * Normalizes confidence score to valid range
   */
  private normalizeConfidenceScore(score: any): number {
    if (typeof score === 'number') {
      return Math.min(Math.max(score, 0), 1);
    }

    const parsed = parseFloat(score);
    if (!isNaN(parsed)) {
      return Math.min(Math.max(parsed, 0), 1);
    }

    return 0.5; // Default confidence score
  }

  private buildEnrichmentPrompt(fdaData: FDADrugLabelResult): string {
    const brandName = fdaData.openfda.brand_name?.[0] || 'Unknown Drug';
    const genericName = fdaData.openfda.generic_name?.[0];
    const manufacturer = fdaData.openfda.manufacturer_name?.[0];
    const indications = fdaData.indications_and_usage?.join(' ') || '';
    const warnings = fdaData.warnings?.join(' ') || '';
    const dosage = fdaData.dosage_and_administration?.join(' ') || '';
    const contraindications = fdaData.contraindications?.join(' ') || '';

    return `You are a medical content specialist creating SEO-optimized drug information for healthcare professionals. 

Analyze this FDA drug label data and create enriched content:

Drug: ${brandName}${genericName ? ` (${genericName})` : ''}
Manufacturer: ${manufacturer}
Indications: ${indications}
Warnings: ${warnings}
Dosage: ${dosage}
Contraindications: ${contraindications}

Please provide a JSON response with the following structure:
{
  "title": "SEO-optimized page title (max 60 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "slug": "url-friendly-slug",
  "summary": "Professional 2-3 paragraph overview for healthcare providers",
  "indicationSummary": "Clear summary of what this drug treats",
  "sideEffectsSummary": "Summary of key side effects and safety information",
  "dosageSummary": "Clear dosing guidance for healthcare providers",
  "warningsSummary": "Key warnings and precautions",
  "contraindicationsSummary": "When not to use this medication",
  "aiGeneratedFaqs": [
    {"question": "Common clinical question", "answer": "Evidence-based answer"},
    {"question": "Another relevant question", "answer": "Professional answer"}
  ],
  "relatedDrugs": ["Similar or alternative medications"],
  "relatedConditions": ["Medical conditions this drug treats"],
  "keywords": ["SEO keywords for this drug"],
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "Drug",
    "name": "${brandName}",
    "description": "Brief drug description"
  }
}

Focus on accuracy, clinical relevance, and SEO optimization for healthcare professionals.`;
  }

  private parseAIResponse(
    response: string,
    fdaData: FDADrugLabelResult,
  ): Partial<DrugEnrichmentResult> {
    try {
      // Try to parse JSON response from AI
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleaned);

      // Validate and sanitize the response
      return {
        title: this.sanitizeText(parsed.title) || this.generateFallbackTitle(fdaData),
        metaDescription: this.sanitizeText(parsed.metaDescription) || '',
        slug: this.sanitizeSlug(parsed.slug) || this.generateFallbackSlug(fdaData),
        summary: this.sanitizeText(parsed.summary) || '',
        indicationSummary: this.sanitizeText(parsed.indicationSummary),
        sideEffectsSummary: this.sanitizeText(parsed.sideEffectsSummary),
        dosageSummary: this.sanitizeText(parsed.dosageSummary),
        warningsSummary: this.sanitizeText(parsed.warningsSummary),
        contraindicationsSummary: this.sanitizeText(parsed.contraindicationsSummary),
        aiGeneratedFaqs: this.sanitizeFaqs(parsed.aiGeneratedFaqs) || [],
        relatedDrugs: this.sanitizeArray(parsed.relatedDrugs) || [],
        relatedConditions: this.sanitizeArray(parsed.relatedConditions) || [],
        keywords: this.sanitizeArray(parsed.keywords) || [],
        structuredData: parsed.structuredData || {},
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.createFallbackEnrichment(fdaData);
    }
  }

  private createFallbackEnrichment(fdaData: FDADrugLabelResult): DrugEnrichmentResult {
    // Handle cases where fdaData might not have expected structure
    const brandName =
      fdaData?.openfda?.brand_name?.[0] || (fdaData as any)?.brandName || 'Unknown Drug';
    const genericName = fdaData?.openfda?.generic_name?.[0] || (fdaData as any)?.genericName;
    const manufacturer = fdaData?.openfda?.manufacturer_name?.[0] || (fdaData as any)?.manufacturer;

    return {
      title: this.generateFallbackTitle(fdaData),
      metaDescription: `${brandName} drug information for healthcare professionals including indications, dosing, and safety information.`,
      slug: this.generateFallbackSlug(fdaData),
      summary: `${brandName}${genericName ? ` (${genericName})` : ''} is manufactured by ${manufacturer}. Please refer to the complete prescribing information.`,
      aiGeneratedFaqs: [],
      relatedDrugs: [],
      relatedConditions: [],
      keywords: [brandName.toLowerCase(), ...(genericName ? [genericName.toLowerCase()] : [])],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Drug',
        name: brandName,
        description: `${brandName} drug information`,
      },
      confidenceScore: 0.3, // Low confidence for fallback
    };
  }

  private generateFallbackTitle(fdaData: FDADrugLabelResult): string {
    const brandName = fdaData?.openfda?.brand_name?.[0] || (fdaData as any)?.brandName || 'Drug';
    return `${brandName} - Drug Information | PrescriberPoint`;
  }

  private generateFallbackSlug(fdaData: FDADrugLabelResult): string {
    const brandName = fdaData?.openfda?.brand_name?.[0] || (fdaData as any)?.brandName || 'drug';
    const ndc = fdaData?.openfda?.product_ndc?.[0] || (fdaData as any)?.ndc || '';
    return `${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${ndc.replace(/[^0-9-]/g, '')}`;
  }

  private calculateConfidenceScore(
    fdaData: FDADrugLabelResult,
    enriched: Partial<DrugEnrichmentResult>,
  ): number {
    let score = 0.5; // Base score

    // Increase confidence based on available FDA data
    if (fdaData.indications_and_usage?.length) score += 0.1;
    if (fdaData.warnings?.length) score += 0.1;
    if (fdaData.dosage_and_administration?.length) score += 0.1;
    if (fdaData.contraindications?.length) score += 0.1;

    // Increase confidence based on enriched content quality
    if (enriched.summary && enriched.summary.length > 100) score += 0.1;
    if (enriched.aiGeneratedFaqs && enriched.aiGeneratedFaqs.length > 0) score += 0.1;

    return Math.round(Math.min(score, 1.0) * 100) / 100; // Round to 2 decimal places
  }

  private sanitizeText(text: string): string | undefined {
    if (!text || typeof text !== 'string') return undefined;
    return text.trim().substring(0, 5000); // Limit length
  }

  private sanitizeSlug(slug: string): string | undefined {
    if (!slug || typeof slug !== 'string') return undefined;
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 200);
  }

  private sanitizeArray(arr: any[]): string[] | undefined {
    if (!Array.isArray(arr)) return undefined;
    return arr.filter((item) => typeof item === 'string').slice(0, 10);
  }

  private sanitizeFaqs(faqs: any[]): Array<{ question: string; answer: string }> | undefined {
    if (!Array.isArray(faqs)) return undefined;
    return faqs
      .filter((faq) => faq && faq.question && faq.answer)
      .map((faq) => ({
        question: this.sanitizeText(faq.question) || '',
        answer: this.sanitizeText(faq.answer) || '',
      }))
      .slice(0, 10);
  }

  /**
   * Gets AI service health status and error metrics
   */
  getHealthStatus() {
    return this.errorTracking.getHealthStatus();
  }

  /**
   * Gets recent AI service errors
   */
  getRecentErrors(limit: number = 10) {
    return this.errorTracking.getRecentErrors(limit);
  }

  /**
   * Gets AI service error metrics
   */
  getErrorMetrics() {
    return this.errorTracking.getErrorMetrics();
  }

  /**
   * Resets AI service error metrics (useful for testing)
   */
  resetErrorMetrics() {
    this.errorTracking.resetMetrics();
  }
}
