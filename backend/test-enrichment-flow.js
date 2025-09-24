const { AppDataSource } = require('./dist/ormconfig');

async function testEnrichmentFlow() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Test the validation middleware with the exact same input as the enrichment service
    const { AIValidationMiddleware } = require('./dist/src/ai/middleware/validation.middleware');

    const validationMiddleware = new AIValidationMiddleware();

    // Test with the exact same identifier that's failing
    const identifier = { type: 'NDC', value: '58151-574' };

    console.log('Testing identifier:', identifier);

    // Test the validation middleware directly
    const result = await validationMiddleware.validateInput(
      AIValidationMiddleware.DrugIdentifierSchema,
      identifier,
      { operation: 'fetchFromFDA', correlationId: 'test123' },
    );

    console.log('Validation result:', result);

    // Now test the enrichment request schema
    const enrichmentRequest = {
      identifiers: [identifier],
      validateIdentifiers: false,
      context: 'Testing enrichment',
    };

    console.log('Testing enrichment request:', enrichmentRequest);

    const enrichmentResult = await validationMiddleware.validateInput(
      AIValidationMiddleware.EnrichmentRequestSchema,
      enrichmentRequest,
      { operation: 'enrichMultipleDrugs', correlationId: 'test123' },
    );

    console.log('Enrichment validation result:', enrichmentResult);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testEnrichmentFlow();

