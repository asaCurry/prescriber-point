import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum IdentifierType {
  NDC = 'ndc',
  UPC = 'upc',
  RXCUI = 'rxcui',
  UNII = 'unii',
  GENERIC_NAME = 'generic_name',
  BRAND_NAME = 'brand_name',
}

export class DrugIdentifier {
  @ApiProperty({
    description: 'Type of drug identifier',
    enum: IdentifierType,
    example: IdentifierType.NDC,
  })
  @IsEnum(IdentifierType)
  type: IdentifierType;

  @ApiProperty({
    description: 'The identifier value',
    example: '0069-2587-68',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  value: string;
}

export class EnrichmentRequest {
  @ApiProperty({
    description: 'Array of drug identifiers to enrich',
    type: [DrugIdentifier],
    minItems: 1,
    maxItems: 10,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DrugIdentifier)
  identifiers: DrugIdentifier[];

  @ApiProperty({
    description: 'Optional context or additional information',
    required: false,
    example: 'Need detailed dosing information for geriatric patients',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  context?: string;

  @ApiProperty({
    description: 'Whether to include confidence scores in response',
    required: false,
    default: true,
  })
  @IsOptional()
  includeConfidence?: boolean = true;

  @ApiProperty({
    description: 'Whether to validate identifiers before processing',
    required: false,
    default: true,
  })
  @IsOptional()
  validateIdentifiers?: boolean = true;
}

export class ValidationError {
  @ApiProperty()
  identifier: DrugIdentifier;

  @ApiProperty()
  errorType: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  suggestions?: string[];
}

export class EnrichmentValidationResult {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ type: [DrugIdentifier] })
  validIdentifiers: DrugIdentifier[];

  @ApiProperty({ type: [ValidationError] })
  errors: ValidationError[];

  @ApiProperty()
  warningCount: number;

  @ApiProperty()
  errorCount: number;
}
