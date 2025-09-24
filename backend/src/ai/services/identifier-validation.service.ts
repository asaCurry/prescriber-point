import { Injectable } from '@nestjs/common';
import {
  DrugIdentifier,
  IdentifierType,
  ValidationError,
  EnrichmentValidationResult,
} from '../dto/enrichment-request.dto';

@Injectable()
export class IdentifierValidationService {
  /**
   * Validates an array of drug identifiers
   */
  async validateIdentifiers(identifiers: DrugIdentifier[]): Promise<EnrichmentValidationResult> {
    const validIdentifiers: DrugIdentifier[] = [];
    const errors: ValidationError[] = [];
    let warningCount = 0;

    for (const identifier of identifiers) {
      const validationResult = await this.validateSingleIdentifier(identifier);

      if (validationResult.isValid) {
        validIdentifiers.push(identifier);
        if (validationResult.hasWarning) {
          warningCount++;
        }
      } else {
        errors.push({
          identifier,
          errorType: validationResult.errorType!,
          message: validationResult.message!,
          suggestions: validationResult.suggestions,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      validIdentifiers,
      errors,
      warningCount,
      errorCount: errors.length,
    };
  }

  /**
   * Validates a single drug identifier
   */
  private async validateSingleIdentifier(identifier: DrugIdentifier): Promise<{
    isValid: boolean;
    hasWarning?: boolean;
    errorType?: string;
    message?: string;
    suggestions?: string[];
  }> {
    const { type, value } = identifier;

    // Remove any whitespace and normalize
    const normalizedValue = value.trim().replace(/\s+/g, '');

    if (!normalizedValue) {
      return {
        isValid: false,
        errorType: 'EMPTY_VALUE',
        message: 'Identifier value cannot be empty',
      };
    }

    switch (type) {
      case IdentifierType.NDC:
        return this.validateNDC(normalizedValue);

      case IdentifierType.UPC:
        return this.validateUPC(normalizedValue);

      case IdentifierType.RXCUI:
        return this.validateRXCUI(normalizedValue);

      case IdentifierType.UNII:
        return this.validateUNII(normalizedValue);

      case IdentifierType.GENERIC_NAME:
        return this.validateGenericName(normalizedValue);

      case IdentifierType.BRAND_NAME:
        return this.validateBrandName(normalizedValue);

      default:
        return {
          isValid: false,
          errorType: 'UNKNOWN_TYPE',
          message: `Unknown identifier type: ${type}`,
        };
    }
  }

  /**
   * Validates NDC (National Drug Code) format
   * NDC can be in various formats: 8-digit (4-4), 10-digit (4-4-2), 11-digit (5-4-2), or hyphenated formats
   */
  private validateNDC(value: string) {
    // Remove hyphens for validation
    const cleanValue = value.replace(/-/g, '');

    // NDC should be 8, 10, or 11 digits (8 for product-only, 10-11 for full package)
    if (!/^\d{8,11}$/.test(cleanValue)) {
      return {
        isValid: false,
        errorType: 'INVALID_NDC_FORMAT',
        message:
          'NDC must be 8, 10, or 11 digits, optionally with hyphens (e.g., 0069-4200, 0069-2587-68)',
        suggestions: [
          'Remove any letters or special characters except hyphens',
          'Ensure the format is XXXX-XXXX, XXXX-XXXX-XX, or XXXXX-XXXX-XX',
          'Check if leading zeros were omitted',
        ],
      };
    }

    // Check for common NDC format patterns
    const hasProperHyphens8 = /^\d{4}-\d{4}$/.test(value); // 8-digit format
    const hasProperHyphens10 = /^\d{4}-\d{4}-\d{2}$/.test(value); // 10-digit format
    const hasProperHyphens11 = /^\d{5}-\d{4}-\d{2}$/.test(value); // 11-digit format
    const isPlainDigits = /^\d{8,11}$/.test(value);

    if (!hasProperHyphens8 && !hasProperHyphens10 && !hasProperHyphens11 && !isPlainDigits) {
      return {
        isValid: true,
        hasWarning: true,
        message: 'NDC format is non-standard but may be valid',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates UPC (Universal Product Code) format
   */
  private validateUPC(value: string) {
    // UPC should be 12 digits
    if (!/^\d{12}$/.test(value)) {
      return {
        isValid: false,
        errorType: 'INVALID_UPC_FORMAT',
        message: 'UPC must be exactly 12 digits',
        suggestions: [
          'Remove any spaces, hyphens, or letters',
          'Ensure all 12 digits are present, including leading zeros',
        ],
      };
    }

    // Validate UPC check digit (basic Luhn-like algorithm for UPC)
    if (!this.validateUPCCheckDigit(value)) {
      return {
        isValid: true,
        hasWarning: true,
        message: 'UPC check digit validation failed - may still be valid',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates RXCUI (RxNorm Concept Unique Identifier)
   */
  private validateRXCUI(value: string) {
    // RXCUI should be a positive integer
    if (!/^\d+$/.test(value)) {
      return {
        isValid: false,
        errorType: 'INVALID_RXCUI_FORMAT',
        message: 'RXCUI must be a positive integer',
        suggestions: [
          'Remove any letters, spaces, or special characters',
          'Ensure the value is a valid RxNorm concept identifier',
        ],
      };
    }

    const rxcui = parseInt(value, 10);
    if (rxcui <= 0 || rxcui > 9999999) {
      return {
        isValid: false,
        errorType: 'INVALID_RXCUI_RANGE',
        message: 'RXCUI must be between 1 and 9,999,999',
        suggestions: [
          'Verify the RXCUI from a reliable RxNorm source',
          'Check if additional digits were added or removed',
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * Validates UNII (Unique Ingredient Identifier)
   */
  private validateUNII(value: string) {
    // UNII should be 10 characters: 8 alphanumeric + 2 check characters
    if (!/^[A-Z0-9]{8}[A-Z0-9]{2}$/.test(value.toUpperCase())) {
      return {
        isValid: false,
        errorType: 'INVALID_UNII_FORMAT',
        message: 'UNII must be 10 alphanumeric characters (letters and numbers)',
        suggestions: [
          'Ensure the format is exactly 10 characters',
          'Use uppercase letters',
          'Remove any spaces or special characters',
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * Validates generic drug name
   */
  private validateGenericName(value: string) {
    // Generic names should be alphabetic with some allowed characters
    if (!/^[a-zA-Z][a-zA-Z0-9\s\-(),.']+$/.test(value)) {
      return {
        isValid: false,
        errorType: 'INVALID_GENERIC_NAME',
        message: 'Generic name contains invalid characters',
        suggestions: [
          'Use only letters, numbers, spaces, hyphens, and common punctuation',
          'Start with a letter',
          'Check spelling against standard drug references',
        ],
      };
    }

    if (value.length < 2 || value.length > 100) {
      return {
        isValid: false,
        errorType: 'INVALID_NAME_LENGTH',
        message: 'Generic name must be between 2 and 100 characters',
        suggestions: ['Check for typos or extra characters', 'Verify the complete generic name'],
      };
    }

    return { isValid: true };
  }

  /**
   * Validates brand drug name
   */
  private validateBrandName(value: string) {
    // Brand names can be more flexible but still have limits
    if (!/^[a-zA-Z][a-zA-Z0-9\s\-().,'®™]+$/.test(value)) {
      return {
        isValid: false,
        errorType: 'INVALID_BRAND_NAME',
        message: 'Brand name contains invalid characters',
        suggestions: [
          'Use only letters, numbers, spaces, and common punctuation',
          'Start with a letter',
          'Brand names may include ® or ™ symbols',
        ],
      };
    }

    if (value.length < 2 || value.length > 100) {
      return {
        isValid: false,
        errorType: 'INVALID_NAME_LENGTH',
        message: 'Brand name must be between 2 and 100 characters',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates UPC check digit using standard UPC algorithm
   */
  private validateUPCCheckDigit(upc: string): boolean {
    if (upc.length !== 12) return false;

    const digits = upc.split('').map(Number);
    const checkDigit = digits[11];

    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return calculatedCheckDigit === checkDigit;
  }

  /**
   * Suggests corrections for common identifier format errors
   */
  getSuggestionsForIdentifier(type: IdentifierType): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case IdentifierType.NDC:
        suggestions.push(
          'NDC format: XXXX-XXXX-XX or XXXXX-XXXX-XX',
          'Include leading zeros if missing',
          'Remove extra spaces or characters',
        );
        break;

      case IdentifierType.UPC:
        suggestions.push(
          'UPC must be exactly 12 digits',
          'Include all leading zeros',
          'Remove any formatting characters',
        );
        break;

      case IdentifierType.RXCUI:
        suggestions.push(
          'RXCUI should be a positive integer',
          'Verify from RxNorm database',
          'Remove any non-numeric characters',
        );
        break;

      case IdentifierType.UNII:
        suggestions.push(
          'UNII format: 10 alphanumeric characters',
          'Use uppercase letters',
          'Verify from FDA UNII database',
        );
        break;

      default:
        suggestions.push('Check the identifier format and try again');
    }

    return suggestions;
  }
}
