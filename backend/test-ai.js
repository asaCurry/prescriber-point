const { AppDataSource } = require('./dist/ormconfig');

async function testAIService() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Get the drug data
    const drug = await AppDataSource.query('SELECT * FROM drugs WHERE ndc = $1', ['58151-574']);

    if (drug.length === 0) {
      console.log('Drug not found');
      return;
    }

    const drugRecord = drug[0];
    console.log('Found drug:', drugRecord.brandName);

    // Parse FDA data
    const fdaData = JSON.parse(drugRecord.fdaData);
    console.log('FDA data keys:', Object.keys(fdaData));

    // Test AI service
    const { AIService } = require('./dist/src/ai/ai.service');
    const aiService = new AIService();

    console.log('Testing AI enrichment...');
    const result = await aiService.enrichDrugData(fdaData);

    console.log('Enrichment result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testAIService();
