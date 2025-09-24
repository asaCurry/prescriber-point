import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('NDC Validation', () => {
    it('should validate correct NDC formats', () => {
      const validNDCs = ['12345-678', '1234-567-89', '00071-0155-23', '50580-608'];

      validNDCs.forEach((ndc) => {
        const result = service.validateNDC(ndc);
        expect(result.success).toBe(true);
        expect(result.data).toBe(ndc);
      });
    });

    it('should reject invalid NDC formats', () => {
      const invalidNDCs = [
        '123', // too short
        'abc-def', // non-numeric
        '12345-678-90-11', // too many parts
        '', // empty
        '12345', // single part
      ];

      invalidNDCs.forEach((ndc) => {
        const result = service.validateNDC(ndc);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });

    it('should normalize NDC format', () => {
      const result = service.validateNDC('  12345-678  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('12345-678');
    });
  });

  describe('Drug Identifier Validation', () => {
    it('should validate correct NDC identifier', () => {
      const identifier = {
        type: 'ndc',
        value: '12345-678',
      };

      const result = service.validateDrugIdentifier(identifier);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(identifier);
    });

    it('should validate correct UPC identifier', () => {
      const identifier = {
        type: 'upc',
        value: '123456789012',
      };

      const result = service.validateDrugIdentifier(identifier);
      expect(result.success).toBe(true);
    });

    it('should validate correct UNII identifier', () => {
      const identifier = {
        type: 'unii',
        value: 'R16CO5Y76E',
      };

      const result = service.validateDrugIdentifier(identifier);
      expect(result.success).toBe(true);
    });

    it('should reject invalid identifier types', () => {
      const identifier = {
        type: 'invalid_type',
        value: '12345',
      };

      const result = service.validateDrugIdentifier(identifier);
      expect(result.success).toBe(false);
    });

    it('should reject invalid NDC in identifier', () => {
      const identifier = {
        type: 'ndc',
        value: 'invalid-ndc',
      };

      const result = service.validateDrugIdentifier(identifier);
      expect(result.success).toBe(false);
    });
  });

  describe('Enrichment Request Validation', () => {
    it('should validate correct enrichment request', () => {
      const request = {
        identifiers: [
          { type: 'ndc', value: '12345-678' },
          { type: 'brand_name', value: 'Tylenol' },
        ],
        context: 'Pain relief medication',
        includeConfidence: true,
        validateIdentifiers: true,
      };

      const result = service.validateEnrichmentRequest(request);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(request);
    });

    it('should provide warnings for large requests', () => {
      const request = {
        identifiers: Array(8)
          .fill(0)
          .map((_, i) => ({ type: 'ndc', value: `12345-${678 + i}` })), // Create unique identifiers
        context: 'A'.repeat(800),
      };

      const result = service.validateEnrichmentRequest(request);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Large number of identifiers may slow processing');
      expect(result.warnings).toContain('Long context may affect AI processing quality');
    });

    it('should reject duplicate identifiers', () => {
      const request = {
        identifiers: [
          { type: 'ndc', value: '12345-678' },
          { type: 'ndc', value: '12345-678' }, // duplicate
        ],
      };

      const result = service.validateEnrichmentRequest(request);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('identifiers: Duplicate identifiers are not allowed');
    });

    it('should reject empty identifier array', () => {
      const request = {
        identifiers: [],
      };

      const result = service.validateEnrichmentRequest(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Drug Data Validation', () => {
    it('should validate correct drug creation data', () => {
      const drugData = {
        brandName: 'Tylenol',
        ndc: '12345-678',
        manufacturer: 'Johnson & Johnson',
        dataSource: 'FDA',
        genericName: 'acetaminophen',
      };

      const result = service.validateCreateDrug(drugData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(drugData);
    });

    it('should validate drug with all optional fields', () => {
      const drugData = {
        brandName: 'Tylenol',
        genericName: 'acetaminophen',
        manufacturer: 'Johnson & Johnson',
        ndc: '12345-678',
        indications: 'Pain relief',
        warnings: 'Do not exceed recommended dose',
        dosage: '500mg every 4-6 hours',
        contraindications: 'Liver disease',
        fdaData: { some: 'data' },
        dataSource: 'FDA',
      };

      const result = service.validateCreateDrug(drugData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(drugData);
    });

    it('should validate minimal drug data', () => {
      const drugData = {}; // All fields are optional in new schema

      const result = service.validateCreateDrug(drugData);
      expect(result.success).toBe(true);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess excellent data quality', () => {
      const drugData = {
        brandName: 'Tylenol',
        ndc: '12345-678',
        manufacturer: 'Johnson & Johnson',
        dataSource: 'FDA',
        genericName: 'acetaminophen',
        fdaData: { some: 'data' },
      };

      const assessment = service.assessDataQuality(drugData);
      expect(assessment.quality).toBe('excellent');
      expect(assessment.score).toBeGreaterThan(0.9);
      expect(assessment.missing).toHaveLength(0);
    });

    it('should assess poor data quality', () => {
      const drugData = {
        brandName: '',
        ndc: '',
        manufacturer: '',
        dataSource: '',
      };

      const assessment = service.assessDataQuality(drugData);
      expect(assessment.quality).toBe('poor');
      expect(assessment.score).toBeLessThan(0.5);
      expect(assessment.missing.length).toBeGreaterThan(0);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize drug data correctly', () => {
      const dirtyData = {
        brandName: '  Tylenol  ',
        ndc: ' 12345-678! ',
        manufacturer: '  Johnson & Johnson  ',
        dataSource: '  fda  ',
        genericName: '  acetaminophen  ',
      };

      const clean = service.sanitizeDrugData(dirtyData);
      expect(clean.brandName).toBe('Tylenol');
      expect(clean.ndc).toBe('12345-678');
      expect(clean.manufacturer).toBe('Johnson & Johnson');
      expect(clean.dataSource).toBe('FDA');
      expect(clean.genericName).toBe('acetaminophen');
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch of identifiers', () => {
      const identifiers = [
        { type: 'ndc', value: '12345-678' },
        { type: 'brand_name', value: 'Tylenol' },
        { type: 'invalid', value: 'bad' }, // This will fail
      ];

      const result = service.validateBatch(identifiers, (item) =>
        service.validateDrugIdentifier(item),
      );

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(2);
    });
  });

  describe('RelatedDrug Validation', () => {
    it('should validate correct related drug creation data', () => {
      const relatedDrugData = {
        sourceDrugId: 1,
        name: 'Ibuprofen',
        brandName: 'Advil',
        genericName: 'ibuprofen',
        manufacturer: 'Pfizer',
        ndc: '54321-987',
        indication: 'Pain relief',
        description: 'Similar pain relief medication',
        confidenceScore: 0.85,
        relationshipType: 'similar_indication',
      };

      const result = service.validateCreateRelatedDrug(relatedDrugData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(relatedDrugData);
    });

    it('should provide warnings for missing optional fields', () => {
      const relatedDrugData = {
        sourceDrugId: 1,
        name: 'Aspirin',
      };

      const result = service.validateCreateRelatedDrug(relatedDrugData);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        'Neither brand name nor generic name provided - this may affect search functionality',
      );
      expect(result.warnings).toContain(
        'No NDC provided - this may limit drug identification capabilities',
      );
      expect(result.warnings).toContain(
        'No confidence score provided - consider adding for quality assessment',
      );
    });

    it('should reject missing required fields', () => {
      const relatedDrugData = {
        sourceDrugId: 1,
        // missing name field
      };

      const result = service.validateCreateRelatedDrug(relatedDrugData);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('name: Required');
    });

    it('should validate relationship consistency', () => {
      const drugId = 1;
      const relatedDrugSourceId = 1;

      const result = service.validateRelatedDrugRelationship(drugId, relatedDrugSourceId);
      expect(result.success).toBe(true);
    });

    it('should reject relationship inconsistency', () => {
      const drugId = 1;
      const relatedDrugSourceId = 2;

      const result = service.validateRelatedDrugRelationship(drugId, relatedDrugSourceId);
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'relatedDrugSourceDrugId: Source drug ID and related drug source drug ID must match',
      );
    });

    it('should sanitize related drug data correctly', () => {
      const dirtyData = {
        name: '  Ibuprofen  ',
        brandName: '  Advil  ',
        genericName: '  ibuprofen  ',
        manufacturer: '  Pfizer  ',
        ndc: ' 54321-987! ',
        relationshipType: '  SIMILAR_INDICATION  ',
      };

      const clean = service.sanitizeRelatedDrugData(dirtyData);
      expect(clean.name).toBe('Ibuprofen');
      expect(clean.brandName).toBe('Advil');
      expect(clean.genericName).toBe('ibuprofen');
      expect(clean.manufacturer).toBe('Pfizer');
      expect(clean.ndc).toBe('54321-987');
      expect(clean.relationshipType).toBe('similar_indication');
    });
  });
});
