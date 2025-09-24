import { Test, TestingModule } from '@nestjs/testing';
import { IdentifierValidationService } from './identifier-validation.service';
import { DrugIdentifier, IdentifierType } from '../dto/enrichment-request.dto';

describe('IdentifierValidationService', () => {
  let service: IdentifierValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentifierValidationService],
    }).compile();

    service = module.get<IdentifierValidationService>(IdentifierValidationService);
  });

  describe('validateIdentifiers', () => {
    it('should validate an array of valid identifiers', async () => {
      const identifiers: DrugIdentifier[] = [
        { type: IdentifierType.NDC, value: '12345-678-90' },
        { type: IdentifierType.UPC, value: '036000291452' }, // Using valid UPC with check digit
        { type: IdentifierType.UNII, value: 'R16CO5Y76E' },
      ];

      const result = await service.validateIdentifiers(identifiers);

      expect(result.isValid).toBe(true);
      expect(result.validIdentifiers).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBeGreaterThanOrEqual(0); // May have warnings for UPC check digit
    });

    it('should identify invalid identifiers', async () => {
      const identifiers: DrugIdentifier[] = [
        { type: IdentifierType.NDC, value: 'invalid-ndc' },
        { type: IdentifierType.UPC, value: '123' }, // too short
        { type: IdentifierType.UNII, value: 'VALID12345' },
      ];

      const result = await service.validateIdentifiers(identifiers);

      expect(result.isValid).toBe(false);
      expect(result.validIdentifiers).toHaveLength(1); // only UNII is valid
      expect(result.errors).toHaveLength(2);
      expect(result.errorCount).toBe(2);
    });

    it('should handle empty identifiers array', async () => {
      const result = await service.validateIdentifiers([]);

      expect(result.isValid).toBe(true);
      expect(result.validIdentifiers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('NDC validation', () => {
    it('should validate correct NDC formats', async () => {
      const validNDCs = ['12345-678-90', '1234-5678-90', '12345678901', '1234567890'];

      for (const ndc of validNDCs) {
        const identifiers = [{ type: IdentifierType.NDC, value: ndc }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid NDC formats', async () => {
      const invalidNDCs = [
        { value: 'abc-def-gh', expectedError: 'INVALID_NDC_FORMAT' },
        { value: '123', expectedError: 'INVALID_NDC_FORMAT' },
        { value: '12345-678-90-11', expectedError: 'INVALID_NDC_FORMAT' },
        { value: '', expectedError: 'EMPTY_VALUE' },
        { value: '12345', expectedError: 'INVALID_NDC_FORMAT' },
      ];

      for (const { value, expectedError } of invalidNDCs) {
        const identifiers = [{ type: IdentifierType.NDC, value }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].errorType).toBe(expectedError);
      }
    });

    it('should handle whitespace in NDC values', async () => {
      const identifiers = [{ type: IdentifierType.NDC, value: '  12345-678-90  ' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
    });
  });

  describe('UPC validation', () => {
    it('should validate correct UPC format', async () => {
      const identifiers = [{ type: IdentifierType.UPC, value: '123456789012' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UPC formats', async () => {
      const invalidUPCs = [
        { value: '12345678901', expectedError: 'INVALID_UPC_FORMAT' }, // too short
        { value: '1234567890123', expectedError: 'INVALID_UPC_FORMAT' }, // too long
        { value: '12345678901a', expectedError: 'INVALID_UPC_FORMAT' }, // contains letter
        { value: '', expectedError: 'EMPTY_VALUE' },
      ];

      for (const { value, expectedError } of invalidUPCs) {
        const identifiers = [{ type: IdentifierType.UPC, value }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].errorType).toBe(expectedError);
      }
    });

    it('should validate UPC with valid check digit', async () => {
      // Using a UPC with valid check digit: 036000291452 (Coca-Cola)
      const identifiers = [{ type: IdentifierType.UPC, value: '036000291452' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
      expect(result.warningCount).toBe(0);
    });
  });

  describe('RXCUI validation', () => {
    it('should validate correct RXCUI format', async () => {
      const identifiers = [{ type: IdentifierType.RXCUI, value: '123456' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid RXCUI formats', async () => {
      const invalidRXCUIs = [
        'abc123',
        '0',
        '10000000', // too large
        '-123',
        '',
      ];

      for (const rxcui of invalidRXCUIs) {
        const identifiers = [{ type: IdentifierType.RXCUI, value: rxcui }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
      }
    });

    it('should validate RXCUI range', async () => {
      const identifiers = [{ type: IdentifierType.RXCUI, value: '9999999' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
    });
  });

  describe('UNII validation', () => {
    it('should validate correct UNII format', async () => {
      const validUNIIs = ['R16CO5Y76E', 'Q40Q9N063P', '362O9ITL9D', 'YKH834O4BH'];

      for (const unii of validUNIIs) {
        const identifiers = [{ type: IdentifierType.UNII, value: unii }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid UNII formats', async () => {
      const invalidUNIIs = [
        { value: 'R16CO5Y76', expectedError: 'INVALID_UNII_FORMAT' }, // too short
        { value: 'R16CO5Y76E1', expectedError: 'INVALID_UNII_FORMAT' }, // too long
        { value: 'R16CO5Y76@', expectedError: 'INVALID_UNII_FORMAT' }, // special character
        { value: '', expectedError: 'EMPTY_VALUE' },
      ];

      for (const { value, expectedError } of invalidUNIIs) {
        const identifiers = [{ type: IdentifierType.UNII, value }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].errorType).toBe(expectedError);
      }
    });

    it('should accept lowercase UNII and convert to uppercase', async () => {
      const identifiers = [{ type: IdentifierType.UNII, value: 'r16co5y76e' }];
      const result = await service.validateIdentifiers(identifiers);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Generic name validation', () => {
    it('should validate correct generic names', async () => {
      const validNames = [
        'acetaminophen',
        'ibuprofen',
        'amoxicillin-clavulanate',
        "acetaminophen (children's)",
        'levothyroxine sodium',
      ];

      for (const name of validNames) {
        const identifiers = [{ type: IdentifierType.GENERIC_NAME, value: name }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid generic names', async () => {
      const invalidNames = [
        '123drug', // starts with number
        'drug@name', // invalid character
        'a', // too short
        'a'.repeat(101), // too long
        '',
      ];

      for (const name of invalidNames) {
        const identifiers = [{ type: IdentifierType.GENERIC_NAME, value: name }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Brand name validation', () => {
    it('should validate correct brand names', async () => {
      const validNames = ['Tylenol', 'Advil', 'Tylenol®', "Children's Tylenol", 'Advil™'];

      for (const name of validNames) {
        const identifiers = [{ type: IdentifierType.BRAND_NAME, value: name }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid brand names', async () => {
      const invalidNames = [
        '123Brand', // starts with number
        'Brand@Name', // invalid character
        'A', // too short
        'B'.repeat(101), // too long
        '',
      ];

      for (const name of invalidNames) {
        const identifiers = [{ type: IdentifierType.BRAND_NAME, value: name }];
        const result = await service.validateIdentifiers(identifiers);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Unknown identifier type', () => {
    it('should reject unknown identifier types', async () => {
      const identifiers = [{ type: 'UNKNOWN_TYPE' as IdentifierType, value: '12345' }];
      const result = await service.validateIdentifiers(identifiers);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorType).toBe('UNKNOWN_TYPE');
    });
  });

  describe('Empty values', () => {
    it('should reject empty identifier values', async () => {
      const identifiers = [{ type: IdentifierType.NDC, value: '' }];
      const result = await service.validateIdentifiers(identifiers);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorType).toBe('EMPTY_VALUE');
    });

    it('should reject whitespace-only values', async () => {
      const identifiers = [{ type: IdentifierType.NDC, value: '   ' }];
      const result = await service.validateIdentifiers(identifiers);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorType).toBe('EMPTY_VALUE');
    });
  });

  describe('getSuggestionsForIdentifier', () => {
    it('should return suggestions for NDC', () => {
      const suggestions = service.getSuggestionsForIdentifier(IdentifierType.NDC);
      expect(suggestions).toContain('NDC format: XXXX-XXXX-XX or XXXXX-XXXX-XX');
      expect(suggestions).toContain('Include leading zeros if missing');
    });

    it('should return suggestions for UPC', () => {
      const suggestions = service.getSuggestionsForIdentifier(IdentifierType.UPC);
      expect(suggestions).toContain('UPC must be exactly 12 digits');
      expect(suggestions).toContain('Include all leading zeros');
    });

    it('should return suggestions for RXCUI', () => {
      const suggestions = service.getSuggestionsForIdentifier(IdentifierType.RXCUI);
      expect(suggestions).toContain('RXCUI should be a positive integer');
      expect(suggestions).toContain('Verify from RxNorm database');
    });

    it('should return suggestions for UNII', () => {
      const suggestions = service.getSuggestionsForIdentifier(IdentifierType.UNII);
      expect(suggestions).toContain('UNII format: 10 alphanumeric characters');
      expect(suggestions).toContain('Use uppercase letters');
    });

    it('should return default suggestion for unknown type', () => {
      const suggestions = service.getSuggestionsForIdentifier('UNKNOWN' as IdentifierType);
      expect(suggestions).toContain('Check the identifier format and try again');
    });
  });
});
