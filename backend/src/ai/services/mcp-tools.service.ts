import { Injectable, Logger } from '@nestjs/common';
import { DrugEnrichmentResolver } from '../drug-enrichment.resolver';

@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);

  constructor(private readonly drugEnrichmentResolver: DrugEnrichmentResolver) {}

  /**
   * Find related drugs using MCP tools
   */
  async findRelatedDrugsViaMCP(
    sourceDrugIdentifier: { type: string; value: string },
    maxResults: number = 5,
    relationshipTypes: string[] = ['similar_indication', 'same_class', 'alternative'],
    includeConfidence: boolean = true,
  ): Promise<any[]> {
    try {
      this.logger.log(
        `🔍 McpToolsService: Finding related drugs via MCP for ${sourceDrugIdentifier.type}: ${sourceDrugIdentifier.value}`,
      );

      const result = await this.drugEnrichmentResolver.findRelatedDrugs({
        sourceDrugIdentifier,
        maxResults,
        relationshipTypes,
        includeConfidence,
      });

      this.logger.debug(`📋 McpToolsService: MCP result received, isError: ${result.isError}`);

      if (result.isError) {
        this.logger.error(
          `❌ McpToolsService: MCP related drugs generation failed: ${result.content[0]?.text}`,
        );
        return [];
      }

      // Parse the result to extract related drugs data
      const resultText = result.content[0]?.text || '';
      this.logger.debug(
        `📝 McpToolsService: Raw MCP response length: ${resultText.length} characters`,
      );

      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        try {
          const resultData = JSON.parse(jsonMatch[1]);
          const relatedDrugs = resultData.relatedDrugs || [];

          this.logger.log(
            `✅ McpToolsService: Successfully parsed ${relatedDrugs.length} related drugs from MCP response`,
          );
          return relatedDrugs;
        } catch (parseError) {
          this.logger.error(
            `❌ McpToolsService: Failed to parse MCP related drugs result:`,
            parseError,
          );
          this.logger.debug(`📝 McpToolsService: Raw JSON content: ${jsonMatch[1]}`);
          return [];
        }
      }

      this.logger.warn(
        `⚠️ McpToolsService: No JSON data found in MCP response. Raw text: ${resultText.substring(0, 200)}...`,
      );
      return [];
    } catch (error) {
      this.logger.error(`❌ McpToolsService: Failed to find related drugs via MCP:`, error);
      return [];
    }
  }

  /**
   * Enrich drug data using MCP tools
   */
  async enrichDrugViaMCP(
    identifiers: Array<{ type: string; value: string }>,
    context?: string,
    includeConfidence: boolean = true,
    validateIdentifiers: boolean = true,
  ): Promise<any> {
    try {
      this.logger.debug(`Enriching drug via MCP for ${identifiers.length} identifiers`);

      const result = await this.drugEnrichmentResolver.enrichDrugsBatch({
        identifiers,
        context,
        includeConfidence,
        validateIdentifiers,
      });

      if (result.isError) {
        this.logger.warn(`MCP drug enrichment failed: ${result.content[0]?.text}`);
        return null;
      }

      // Parse the result to extract enrichment data
      const resultText = result.content[0]?.text || '';

      // For now, return the text result
      // In a full implementation, this would parse structured data
      return {
        success: true,
        result: resultText,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to enrich drug via MCP:`, error);
      return null;
    }
  }

  /**
   * Validate drug identifiers using MCP tools
   */
  async validateIdentifiersViaMCP(
    identifiers: Array<{ type: string; value: string }>,
  ): Promise<any> {
    try {
      this.logger.debug(`Validating ${identifiers.length} identifiers via MCP`);

      const result = await this.drugEnrichmentResolver.validateDrugIdentifiers({
        identifiers,
      });

      if (result.isError) {
        this.logger.warn(`MCP identifier validation failed: ${result.content[0]?.text}`);
        return null;
      }

      return {
        success: true,
        result: result.content[0]?.text || '',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to validate identifiers via MCP:`, error);
      return null;
    }
  }
}
