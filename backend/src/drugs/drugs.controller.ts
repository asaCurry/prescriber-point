import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DrugsService } from './drugs.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';
import { DrugSearchResult } from '../fda/fda.service';

@ApiTags('drugs')
@Controller('drugs')
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
  @ApiOperation({ summary: 'Type-ahead search for drugs by name or NDC' })
  @ApiResponse({ status: 200, description: 'Search results', type: [Object] })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 3 characters)', required: true })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false })
  async searchDrugs(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<DrugSearchResult[]> {
    if (!query || query.length < 3) {
      return [];
    }
    return this.drugsService.searchDrugs(query, limit || 10);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get drug by slug' })
  @ApiResponse({ status: 200, description: 'Drug found', type: Drug })
  findOne(@Param('slug') slug: string) {
    return this.drugsService.findBySlug(slug);
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
