import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface CacheInvalidationOptions {
  type: 'drug' | 'global';
  slug?: string;
  ndc?: string;
  paths?: string[];
  tags?: string[];
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private readonly frontendUrl: string;
  private readonly webhookSecret: string;
  private readonly enabled: boolean;

  constructor() {
    this.frontendUrl =
      process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'fallback-secret';
    this.enabled = process.env.NODE_ENV !== 'test'; // Disable in tests
  }

  /**
   * Invalidate cache for a specific drug page
   */
  async invalidateDrugCache(slug: string, ndc?: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Cache invalidation disabled');
      return;
    }

    try {
      this.logger.debug(`Invalidating cache for drug: ${slug} (NDC: ${ndc})`);

      const response = await this.callWebhook({
        type: 'drug',
        slug,
        ndc,
      });

      this.logger.log(`Successfully invalidated cache for drug ${slug}: ${response.message}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache for drug ${slug}:`, error.message);
      // Don't throw - cache invalidation failure shouldn't break the main flow
    }
  }

  /**
   * Invalidate global drug-related caches
   */
  async invalidateGlobalCache(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Cache invalidation disabled');
      return;
    }

    try {
      this.logger.debug('Invalidating global drug cache');

      const response = await this.callWebhook({
        type: 'global',
      });

      this.logger.log(`Successfully invalidated global cache: ${response.message}`);
    } catch (error) {
      this.logger.warn('Failed to invalidate global cache:', error.message);
    }
  }

  /**
   * Invalidate specific paths
   */
  async invalidatePaths(paths: string[]): Promise<void> {
    if (!this.enabled || !paths.length) {
      return;
    }

    try {
      this.logger.debug(`Invalidating paths: ${paths.join(', ')}`);

      const response = await this.callWebhook({
        type: 'drug', // Use drug type as default
        paths,
      });

      this.logger.log(`Successfully invalidated paths: ${response.message}`);
    } catch (error) {
      this.logger.warn('Failed to invalidate paths:', error.message);
    }
  }

  /**
   * Generate drug page slug from brand name and NDC
   */
  generateDrugSlug(brandName: string, ndc: string): string {
    const cleanName = brandName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const cleanNDC = ndc.replace(/[^0-9-]/g, '');
    return `${cleanName}-${cleanNDC}`;
  }

  /**
   * Call the Next.js webhook
   */
  private async callWebhook(options: CacheInvalidationOptions): Promise<any> {
    const webhookUrl = `${this.frontendUrl}/api/revalidate`;

    const payload = {
      secret: this.webhookSecret,
      ...options,
    };

    this.logger.debug(`Calling webhook: ${webhookUrl}`, payload);

    const response = await axios.post(webhookUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PrescriberPoint-Backend/1.0',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Webhook returned status ${response.status}: ${response.statusText}`);
    }

    return response.data;
  }

  /**
   * Health check for the invalidation service
   */
  async healthCheck(): Promise<{ healthy: boolean; url: string }> {
    if (!this.enabled) {
      return { healthy: false, url: 'disabled' };
    }

    try {
      const webhookUrl = `${this.frontendUrl}/api/revalidate`;
      const response = await axios.get(webhookUrl, { timeout: 5000 });
      return { healthy: response.status === 200, url: webhookUrl };
    } catch (error) {
      return { healthy: false, url: this.frontendUrl };
    }
  }
}
