import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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
  };
  indications_and_usage?: string[];
  contraindications?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  adverse_reactions?: string[];
  active_ingredient?: string[];
  inactive_ingredient?: string[];
  purpose?: string[];
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
      return [];
    }

    try {
      const results = await Promise.all([
        this.searchByBrandName(query, Math.ceil(limit / 3)),
        this.searchByGenericName(query, Math.ceil(limit / 3)),
        this.searchByNDC(query, Math.ceil(limit / 3)),
      ]);

      // Flatten and deduplicate results
      const allResults = results.flat();
      const uniqueResults = this.deduplicateResults(allResults);

      return uniqueResults.slice(0, limit);
    } catch (error) {
      this.logger.error(`FDA search failed for query: ${query}`, error);
      return [];
    }
  }

  /**
   * Get detailed drug information by exact NDC
   */
  async getDrugByNDC(ndc: string): Promise<FDADrugResult | null> {
    try {
      const response = await axios.get<FDASearchResponse>(this.baseUrl, {
        params: {
          search: `openfda.product_ndc:"${ndc}"`,
          limit: 1,
        },
        timeout: 10000,
      });

      return response.data.results?.[0] || null;
    } catch (error) {
      this.logger.error(`Failed to fetch drug by NDC: ${ndc}`, error);
      return null;
    }
  }

  /**
   * Search by brand name with fuzzy matching
   */
  private async searchByBrandName(query: string, limit: number): Promise<DrugSearchResult[]> {
    try {
      // Try exact match first, then fuzzy match
      const searchQueries = [
        `openfda.brand_name:"${query}"`,
        `openfda.brand_name:${query}*`,
        `openfda.brand_name:*${query}*`,
      ];

      for (const searchQuery of searchQueries) {
        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 5000,
        });

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.warn(`Brand name search failed for: ${query}`, error.message);
      return [];
    }
  }

  /**
   * Search by generic name with fuzzy matching
   */
  private async searchByGenericName(query: string, limit: number): Promise<DrugSearchResult[]> {
    try {
      const searchQueries = [
        `openfda.generic_name:"${query}"`,
        `openfda.generic_name:${query}*`,
        `openfda.generic_name:*${query}*`,
      ];

      for (const searchQuery of searchQueries) {
        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 5000,
        });

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.warn(`Generic name search failed for: ${query}`, error.message);
      return [];
    }
  }

  /**
   * Search by NDC code
   */
  private async searchByNDC(query: string, limit: number): Promise<DrugSearchResult[]> {
    // Only search NDC if the query looks like an NDC (contains numbers and possibly dashes)
    if (!/[\d-]/.test(query)) {
      return [];
    }

    try {
      const searchQueries = [
        `openfda.product_ndc:"${query}"`,
        `openfda.product_ndc:${query}*`,
        `openfda.package_ndc:"${query}"`,
        `openfda.package_ndc:${query}*`,
      ];

      for (const searchQuery of searchQueries) {
        const response = await axios.get<FDASearchResponse>(this.baseUrl, {
          params: {
            search: searchQuery,
            limit: limit,
          },
          timeout: 5000,
        });

        if (response.data.results?.length > 0) {
          return this.transformFDAResults(response.data.results);
        }
      }

      return [];
    } catch (error) {
      this.logger.warn(`NDC search failed for: ${query}`, error.message);
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
