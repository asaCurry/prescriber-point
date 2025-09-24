import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugDto {
  @ApiProperty({ description: 'Unique drug identifier from external source (e.g., FDA SPL ID)' })
  @IsString()
  drugId: string;

  @ApiProperty({ description: 'Brand/trade name of the drug' })
  @IsString()
  brandName: string;

  @ApiProperty({ description: 'NDC (National Drug Code)' })
  @IsString()
  ndc: string;

  @ApiPropertyOptional({ description: 'Generic name of the drug' })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiProperty({ description: 'Manufacturer name' })
  @IsString()
  manufacturer: string;

  @ApiProperty({ description: 'Data source (e.g., FDA, RxNorm)' })
  @IsString()
  dataSource: string;

  @ApiPropertyOptional({ description: 'Data version for tracking' })
  @IsOptional()
  @IsString()
  dataVersion?: string;

  @ApiPropertyOptional({ description: 'Drug indications and usage' })
  @IsOptional()
  @IsString()
  indications?: string;

  @ApiPropertyOptional({ description: 'Warnings and precautions' })
  @IsOptional()
  @IsString()
  warnings?: string;

  @ApiPropertyOptional({ description: 'Dosage and administration information' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ description: 'Contraindications' })
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional({ description: 'Original raw data from FDA API' })
  @IsOptional()
  @IsObject()
  fdaData?: any;
}
