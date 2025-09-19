import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  ndc: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiProperty()
  @IsString()
  manufacturer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  indications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  contraindications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dosing?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  warnings?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  originalLabelData?: any;
}
