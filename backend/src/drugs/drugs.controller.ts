import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DrugsService } from './drugs.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { Drug } from './entities/drug.entity';

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