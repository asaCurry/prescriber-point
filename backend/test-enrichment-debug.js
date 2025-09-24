const { AppDataSource } = require('./dist/ormconfig');

async function testEnrichmentDebug() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Test the enrichment service directly
    const { EnrichmentService } = require('./dist/src/ai/services/enrichment.service');

    // Create a mock drugs service to avoid dependency injection issues
    const mockDrugsService = {
      searchDrugs: async (query) => {
        console.log('Mock searchDrugs called with:', query);
        return [];
      },
    };

    // Create a mock FDA service to avoid dependency injection issues
    const mockFdaService = {
      getDrugByNDC: async (ndc) => {
        console.log('Mock getDrugByNDC called with:', ndc);
        // Return mock FDA data
        return {
          id: 'mock-fda-id',
          openfda: {
            brand_name: ['Zoloft'],
            generic_name: ['sertraline'],
            manufacturer_name: ['Viatris Specialty LLC'],
            product_ndc: [ndc],
          },
          indications_and_usage: ['Treatment of major depressive disorder'],
          warnings: ['May cause suicidal thoughts'],
          dosage_and_administration: ['Take once daily with food'],
        };
      },
      searchDrugs: async (query, limit) => {
        console.log('Mock searchDrugs called with:', query, limit);
        return [];
      },
    };

    // Create a mock AI service to avoid dependency injection issues
    const mockAiService = {
      enrichDrugData: async (fdaData) => {
        console.log('Mock enrichDrugData called with:', fdaData.id);
        // Return mock AI-enriched data
        return {
          title: `AI-Enhanced: ${fdaData.openfda.brand_name[0]} - Comprehensive Drug Information`,
          summary: `AI-generated comprehensive summary for ${fdaData.openfda.brand_name[0]} (${fdaData.openfda.generic_name[0]}). This medication is manufactured by ${fdaData.openfda.manufacturer_name[0]} and is indicated for the treatment of major depressive disorder.`,
          faqs: [
            {
              question: 'What is the recommended dosage for this medication?',
              answer:
                'The recommended starting dose is 50mg once daily, taken with food. Dosage may be adjusted based on individual response and tolerability.',
            },
            {
              question: 'What are the common side effects?',
              answer:
                'Common side effects may include nausea, diarrhea, insomnia, dry mouth, and dizziness. Most side effects are mild and tend to improve over time.',
            },
          ],
          keyPoints: [
            'Take with food to reduce stomach upset',
            'May take 4-6 weeks to see full therapeutic effect',
            'Do not stop taking suddenly without consulting your doctor',
          ],
          confidence: 0.95,
        };
      },
    };

    const enrichmentService = new EnrichmentService();
    enrichmentService.drugsService = mockDrugsService;
    enrichmentService.fdaService = mockFdaService;
    enrichmentService.aiService = mockAiService;

    // Test with lowercase identifier type to match the enum
    const identifier = { type: 'ndc', value: '58151-574' };

    console.log('Testing identifier:', identifier);

    // Test the enrichment service directly
    const result = await enrichmentService.enrichMultipleDrugs({
      identifiers: [identifier],
      validateIdentifiers: false,
      context: 'Testing enrichment',
    });

    console.log('Enrichment result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testEnrichmentDebug();
