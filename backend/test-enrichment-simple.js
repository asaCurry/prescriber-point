const { AppDataSource } = require('./dist/ormconfig');

async function testEnrichment() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Test the validation middleware directly
    const { AIValidationMiddleware } = require('./dist/src/ai/middleware/validation.middleware');

    const validationMiddleware = new AIValidationMiddleware();

    // Test with uppercase identifier type
    const identifier = { type: 'NDC', value: '58151-574' };

    console.log('Testing identifier:', identifier);

    const result = await validationMiddleware.validateInput(
      AIValidationMiddleware.DrugIdentifierSchema,
      identifier,
      { operation: 'test', correlationId: 'test123' },
    );

    console.log('Validation result:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testEnrichment();

