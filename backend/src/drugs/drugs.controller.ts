import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DrugsService } from './drugs.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';
import { DrugSearchResult } from '../fda/fda.service';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

@ApiTags('drugs')
@Controller('drugs')
@UseGuards(RateLimitGuard)
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new drug' })
  @ApiResponse({ status: 201, description: 'Drug created successfully', type: Drug })
  create(@Body() createDrugDto: CreateDrugDto) {
    return this.drugsService.create(createDrugDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all drugs' })
  @ApiResponse({ status: 200, description: 'List of drugs', type: [Drug] })
  findAll(
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.drugsService.findAll({ search, limit, offset });
  }

  @Get('search')
  @RateLimit({ windowMs: 60000, max: 30, message: 'Search rate limit exceeded. Try again later.' })
  @ApiOperation({ summary: 'Type-ahead search for drugs by name or NDC' })
  @ApiResponse({ status: 200, description: 'Search results', type: [Object] })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 3 characters)', required: true })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results (1-50)', required: false })
  async searchDrugs(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<DrugSearchResult[]> {
    // Input validation and sanitization
    if (!query || typeof query !== 'string') {
      return [];
    }

    // Sanitize query - remove potentially harmful characters
    const sanitizedQuery = query.trim().replace(/[<>\"'%;()&+]/g, '');

    if (sanitizedQuery.length < 3) {
      return [];
    }

    // Validate and limit the limit parameter
    const validatedLimit = Math.min(Math.max(limit || 10, 1), 50);

    return this.drugsService.searchDrugs(sanitizedQuery, validatedLimit);
  }

  @Get('fetch-and-cache/:ndc')
  @RateLimit({
    windowMs: 300000,
    max: 10,
    message: 'FDA fetch rate limit exceeded. Try again later.',
  })
  @ApiOperation({ summary: 'Fetch FDA data and cache it to database' })
  @ApiResponse({ status: 200, description: 'Drug data fetched and cached', type: Drug })
  @ApiResponse({ status: 400, description: 'Invalid NDC format' })
  @ApiResponse({ status: 404, description: 'Drug not found in FDA database' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiQuery({
    name: 'forceRefresh',
    description: 'Force refresh existing data',
    required: false,
    type: Boolean,
  })
  async fetchAndCacheDrug(
    @Param('ndc') ndc: string,
    @Query('forceRefresh') forceRefresh?: boolean,
  ) {
    // Validate NDC format
    if (!ndc || typeof ndc !== 'string') {
      throw new Error('NDC parameter is required');
    }

    // Sanitize NDC - only allow alphanumeric characters and hyphens
    const sanitizedNDC = ndc.trim().replace(/[^a-zA-Z0-9-]/g, '');

    if (sanitizedNDC.length < 4) {
      throw new Error('Invalid NDC format: too short');
    }

    return this.drugsService.fetchAndCacheFDADrug(sanitizedNDC, forceRefresh || false);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get drug by slug' })
  @ApiResponse({ status: 200, description: 'Drug found', type: Drug })
  @ApiQuery({
    name: 'waitForEnrichment',
    required: false,
    type: Boolean,
    description: 'Wait for enrichment to complete on first visit',
  })
  findOne(@Param('slug') slug: string, @Query('waitForEnrichment') waitForEnrichment?: string) {
    const shouldWait = waitForEnrichment === 'true';
    return this.drugsService.findBySlug(slug, shouldWait);
  }

  @Get(':slug/debug')
  @ApiOperation({ summary: 'Debug drug data with related drugs' })
  async debugDrug(@Param('slug') slug: string) {
    const drug = await this.drugsService.findBySlug(slug, false);

    // Also fetch related drugs directly
    const relatedDrugs = await this.drugsService.getRelatedDrugs(drug.id);

    return {
      drug: {
        id: drug.id,
        ndc: drug.ndc,
        brandName: drug.brandName,
        hasRelatedDrugsRelation: !!drug.relatedDrugs,
        relatedDrugsCount: drug.relatedDrugs?.length || 0,
      },
      relatedDrugsDirect: {
        count: relatedDrugs.length,
        drugs: relatedDrugs.map((rd) => ({
          id: rd.id,
          name: rd.name,
          sourceDrugId: rd.sourceDrug?.id,
        })),
      },
    };
  }

  @Get('slugs')
  @ApiOperation({ summary: 'Get all drug slugs for sitemap generation (cached for 30 minutes)' })
  @ApiResponse({ status: 200, description: 'List of drug slugs', type: [String] })
  async getDrugSlugs(@Res() res) {
    const slugs = await this.drugsService.getAllDrugSlugs();

    // Set cache headers for 30 minutes
    res.set({
      'Cache-Control': 'public, max-age=1800', // 30 minutes
      ETag: `"drug-slugs-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString(),
    });

    return res.json(slugs);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related drugs for a specific drug' })
  @ApiResponse({ status: 200, description: 'Related drugs found' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async getRelatedDrugs(@Param('id') id: string) {
    const drugId = parseInt(id, 10);
    if (isNaN(drugId)) {
      throw new Error('Invalid drug ID');
    }
    return this.drugsService.getRelatedDrugs(drugId);
  }

  @Post(':id/related/generate')
  @RateLimit({
    windowMs: 300000, // 5 minutes
    max: 5,
    message: 'Related drugs generation rate limit exceeded. Try again later.',
  })
  @ApiOperation({ summary: 'Manually trigger related drugs generation via MCP' })
  @ApiResponse({ status: 200, description: 'Related drugs generation triggered' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateRelatedDrugs(@Param('id') id: string) {
    const drugId = parseInt(id, 10);
    if (isNaN(drugId)) {
      throw new Error('Invalid drug ID');
    }
    return this.drugsService.generateRelatedDrugsViaMCP(drugId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update drug' })
  @ApiResponse({ status: 200, description: 'Drug updated', type: Drug })
  update(@Param('id') id: string, @Body() updateDrugDto: Partial<CreateDrugDto>) {
    return this.drugsService.update(id, updateDrugDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete drug' })
  @ApiResponse({ status: 200, description: 'Drug deleted' })
  remove(@Param('id') id: string) {
    return this.drugsService.remove(id);
  }
}
