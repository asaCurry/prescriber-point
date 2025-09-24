import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CreateDrugDto } from '../drugs/dto/create-drug.dto';

export interface FDADrugResult {
  id: string;
  openfda: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_ndc?: string[];
    package_ndc?: string[];
    substance_name?: string[];
    product_type?: string[];
    route?: string[];
    application_number?: string[];
    unii?: string[];
    rxcui?: string[];
    spl_id?: string[];
  };
  indications_and_usage?: string[];
  contraindications?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  warnings_and_precautions?: string[];
  adverse_reactions?: string[];
  active_ingredient?: string[];
  inactive_ingredient?: string[];
  purpose?: string[];
  description?: string[];
  how_supplied?: string[];
  pregnancy?: string[];
  overdosage?: string[];
  drug_abuse_and_dependence?: string[];
  clinical_pharmacology?: string[];
  effective_time?: string;
}

export interface FDASearchResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: FDADrugResult[];
}

export interface DrugSearchResult {
  id: string;
  brandName: string;
  genericName?: string;
  manufacturer: string;
  ndc: string;
  source: 'fda' | 'local';
}

@Injectable()
export class FdaService {
  private readonly logger = new Logger(FdaService.name);
  private readonly baseUrl = 'https://api.fda.gov/drug/label.json';

  constructor() {}

  /**
   * Search for drugs using FDA API with type-ahead functionality
   * Searches both brand names, generic names, and NDC codes
   */
  async searchDrugs(query: string, limit: number = 10): Promise<DrugSearchResult[]> {
    if (query.length < 3) {
      this.logger.debug(`Query too short: ${query} (${query.length} chars)`);
      return [];
    }

    this.logger.debug(`Starting FDA search for query: "${query}" with limit: ${limit}`);

    try {
      const results = await Promise.all([
        this.searchByBrandName(query, Math.ceil(limit / 3)),
        this.searchByGenericName(query, Math.ceil(limit / 3)),
        this.searchByNDC(query, Math.ceil(limit / 3)),
      ]);

      // Flatten and deduplicate results
      const allResults = results.flat();
      const uniqueResults = this.deduplicateResults(allResults);
      const finalResults = uniqueResults.slice(0, limit);

      this.logger.debug(`FDA search completed for "${query}": ${finalResults.length} results`);
      return finalResults;
    } catch (error) {
      this.logger.error(`FDA search failed for query: ${query}`, {
        error: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Get detailed drug information by exact NDC
   * Handles both product NDC and package NDC formats
   */
  async getDrugByNDC(ndc: string): Promise<FDADrugResult | null> {
    // Normalize NDC format - remove any extra formatting
    const normalizedNDC = this.normalizeNDC(ndc);

    this.logger.debug(`Fetching drug by NDC: ${ndc} (normalized: ${normalizedNDC})`);

    try {
      // Try multiple NDC search strategies
      const searchStrategies = [
        `openfda.product_ndc:"${normalizedNDC}"`,
        `openfda.package_ndc:"${normalizedNDC}"`,
        `openfda.product_ndc:"${ndc}"`,
        `openfda.package_ndc:"${ndc}"`,
      ];

      for (const searchQuery of searchStrategies) {
        this.logger.debug(`Trying NDC lookup: ${searchQuery}`);

        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: 1,
          },
          timeout: 15000,
          headers: {
            'User-Agent': 'PrescriberPoint/1.0',
          },
        });

        if (response.data.results?.length > 0) {
          this.logger.debug(`Found drug with NDC ${ndc} using strategy: ${searchQuery}`);
          return response.data.results[0];
        }
      }

      this.logger.warn(`No drug found for NDC: ${ndc}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch drug by NDC: ${ndc}`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return null;
    }
  }

  /**
   * Search by brand name with fuzzy matching
   */
  private async searchByBrandName(query: string, limit: number): Promise<DrugSearchResult[]> {
    try {
      // Try different search patterns based on FDA API documentation
      const searchQueries = [
        `openfda.brand_name:"${query}"`, // Exact match
        `openfda.brand_name:${query}*`, // Prefix match
        `openfda.brand_name:*${query}*`, // Contains match
      ];

      for (const searchQuery of searchQueries) {
        this.logger.debug(`Trying brand name search: ${searchQuery}`);

        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'PrescriberPoint/1.0',
          },
        });

        this.logger.debug(
          `FDA API response for ${searchQuery}: ${response.data.results?.length || 0} results`,
        );

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.debug(`Brand name search failed for: ${query}`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Search by generic name with fuzzy matching
   */
  private async searchByGenericName(query: string, limit: number): Promise<DrugSearchResult[]> {
    try {
      const searchQueries = [
        `openfda.generic_name:"${query}"`, // Exact match
        `openfda.generic_name:${query}*`, // Prefix match
        `openfda.generic_name:*${query}*`, // Contains match
      ];

      for (const searchQuery of searchQueries) {
        this.logger.debug(`Trying generic name search: ${searchQuery}`);

        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'PrescriberPoint/1.0',
          },
        });

        this.logger.debug(
          `FDA API response for ${searchQuery}: ${response.data.results?.length || 0} results`,
        );

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.debug(`Generic name search failed for: ${query}`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Search by NDC code with type-ahead functionality
   * More flexible than exact NDC lookup
   */
  private async searchByNDC(query: string, limit: number): Promise<DrugSearchResult[]> {
    // Only search NDC if the query looks like it could be an NDC
    if (!/\d/.test(query) || query.length < 3) {
      return [];
    }

    try {
      // For type-ahead search, use more flexible patterns
      const searchQueries = [
        `openfda.product_ndc:${query}*`, // Prefix match
        `openfda.package_ndc:${query}*`, // Prefix match package NDC
      ];

      // If query looks like a complete NDC, also try exact match
      if (FdaService.isValidNDCFormat(query)) {
        searchQueries.unshift(`openfda.product_ndc:"${query}"`, `openfda.package_ndc:"${query}"`);
      }

      for (const searchQuery of searchQueries) {
        this.logger.debug(`Trying NDC search: ${searchQuery}`);

        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'PrescriberPoint/1.0',
          },
        });

        this.logger.debug(
          `FDA API response for ${searchQuery}: ${response.data.results?.length || 0} results`,
        );

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.error(`NDC search failed for: ${query}`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Transform FDA API results to our standard format
   */
  private transformFDAResults(fdaResults: FDADrugResult[]): DrugSearchResult[] {
    return fdaResults
      .map((result) => {
        const brandName = result.openfda?.brand_name?.[0];
        const genericName = result.openfda?.generic_name?.[0];
        const manufacturer = result.openfda?.manufacturer_name?.[0];
        const ndc = result.openfda?.product_ndc?.[0] || result.openfda?.package_ndc?.[0];

        // Skip results without essential data
        if (!brandName || !manufacturer || !ndc) {
          return null;
        }

        return {
          id: result.id,
          brandName,
          genericName,
          manufacturer,
          ndc,
          source: 'fda' as const,
        };
      })
      .filter(Boolean);
  }

  /**
   * Remove duplicate results based on NDC
   */
  private deduplicateResults(results: DrugSearchResult[]): DrugSearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.ndc)) {
        return false;
      }
      seen.add(result.ndc);
      return true;
    });
  }

  /**
   * Normalize NDC format for consistent searching
   * Handles various NDC formats: 1234-567, 1234-567-89, 01234-0567-89, etc.
   */
  private normalizeNDC(ndc: string): string {
    // Remove all non-digit characters
    const digitsOnly = ndc.replace(/\D/g, '');

    // FDA NDCs are typically 10-11 digits
    if (digitsOnly.length >= 10) {
      // Format as standard NDC: XXXXX-XXXX-XX or XXXX-XXXX-XX
      if (digitsOnly.length === 10) {
        return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8)}`;
      } else if (digitsOnly.length === 11) {
        return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
      }
    }

    // Return original if we can't normalize it properly
    return ndc;
  }

  /**
   * Validate NDC format
   * NDCs can be in various formats but should contain digits and possibly dashes
   * Examples: 1234-567, 12345-678, 1234-567-89, 12345-678-90
   */
  static isValidNDCFormat(ndc: string): boolean {
    if (!ndc || typeof ndc !== 'string') {
      return false;
    }

    // Must contain at least some digits
    if (!/\d/.test(ndc)) {
      return false;
    }

    // Remove all digits and dashes to see what's left
    const nonNDCChars = ndc.replace(/[\d-]/g, '');

    // Should be mostly digits and dashes (allow a few other characters for flexibility)
    if (nonNDCChars.length > 2) {
      return false;
    }

    // Should have reasonable length (NDCs are typically 8-13 characters with dashes)
    if (ndc.length < 4 || ndc.length > 15) {
      return false;
    }

    // Should have at least 4 digits total
    const digitCount = (ndc.match(/\d/g) || []).length;
    return digitCount >= 4;
  }

  /**
   * Transform FDA result to standardized drug data
   * Handles missing or malformed data gracefully
   */
  static transformFDAResultToDrug(fdaResult: FDADrugResult): Partial<CreateDrugDto> | null {
    const brandName = fdaResult.openfda?.brand_name?.[0];
    const genericName = fdaResult.openfda?.generic_name?.[0];
    const manufacturer = fdaResult.openfda?.manufacturer_name?.[0];
    const productNDC = fdaResult.openfda?.product_ndc?.[0];
    const packageNDC = fdaResult.openfda?.package_ndc?.[0];

    // Use product NDC first, fall back to package NDC
    const ndc = productNDC || packageNDC;

    // Must have at least brand name and NDC
    if (!brandName || !ndc) {
      return null;
    }

    // Extract detailed drug information from FDA data
    const indications = fdaResult.indications_and_usage?.join('\n\n') || null;

    // Combine warnings and warnings_and_precautions
    const warningsArray = [
      ...(fdaResult.warnings || []),
      ...(fdaResult.warnings_and_precautions || []),
    ];
    const warnings = warningsArray.length > 0 ? warningsArray.join('\n\n') : null;

    const dosage = fdaResult.dosage_and_administration?.join('\n\n') || null;
    const contraindications = fdaResult.contraindications?.join('\n\n') || null;

    return {
      drugId: fdaResult.id,
      brandName: brandName,
      genericName: genericName || undefined,
      manufacturer: manufacturer || 'Unknown',
      ndc: ndc,
      // Extract the detailed information that was missing
      indications: indications,
      warnings: warnings,
      dosage: dosage,
      contraindications: contraindications,
      dataSource: 'FDA',
      dataVersion: fdaResult.effective_time,
      fdaData: fdaResult,
    };
  }

  /**
   * Generate drug slug from brand name and NDC
   */
  static generateSlug(brandName: string, ndc: string): string {
    const cleanName = brandName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const cleanNDC = ndc.replace(/[^0-9-]/g, '');

    return `${cleanName}-${cleanNDC}`;
  }
}
