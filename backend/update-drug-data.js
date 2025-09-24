const { AppDataSource } = require('./dist/ormconfig');

async function updateDrugData() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Get the drug record
    const drug = await AppDataSource.query('SELECT * FROM drugs WHERE ndc = $1', ['58151-574']);

    if (drug.length === 0) {
      console.log('Drug not found');
      return;
    }

    const drugRecord = drug[0];
    console.log('Found drug:', drugRecord.brandName);

    // Extract data from fdaData
    const fdaData = JSON.parse(drugRecord.fdaData);

    const indications = fdaData.indications_and_usage?.join('\n\n') || null;
    const dosage = fdaData.dosage_and_administration?.join('\n\n') || null;

    const warningsArray = [
      ...(fdaData.warnings || []),
      ...(fdaData.warnings_and_precautions || []),
    ];
    const warnings = warningsArray.length > 0 ? warningsArray.join('\n\n') : null;

    const contraindications = fdaData.contraindications?.join('\n\n') || null;

    console.log('Extracted data:');
    console.log('Indications:', indications ? 'Found' : 'Not found');
    console.log('Dosage:', dosage ? 'Found' : 'Not found');
    console.log('Warnings:', warnings ? 'Found' : 'Not found');
    console.log('Contraindications:', contraindications ? 'Found' : 'Not found');

    // Update the drug record
    await AppDataSource.query(
      'UPDATE drugs SET indications = $1, dosage = $2, warnings = $3, contraindications = $4 WHERE id = $5',
      [indications, dosage, warnings, contraindications, drugRecord.id],
    );

    console.log('Drug record updated successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

updateDrugData();
