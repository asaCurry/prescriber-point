const { AppDataSource } = require('./dist/ormconfig');
const { EnrichmentService } = require('./dist/src/ai/services/enrichment.service');

async function triggerEnrichment() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Create enrichment service instance
    const enrichmentService = new EnrichmentService();

    // Trigger enrichment for Zoloft with correct lowercase identifier type
    const result = await enrichmentService.enrichMultipleDrugs({
      identifiers: [{ type: 'ndc', value: '58151-574' }],
      validateIdentifiers: false,
      context: 'Manual enrichment trigger',
    });

    console.log('Enrichment result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

triggerEnrichment();
