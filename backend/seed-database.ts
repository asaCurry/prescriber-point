// SEEDER FUNCTIONALITY COMMENTED OUT - UNCOMMENT WHEN READY TO USE
/*
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './src/app.module';
import { DrugsService } from './src/drugs/drugs.service';
import { FdaService } from './src/fda/fda.service';
import { CreateDrugDto } from './src/drugs/dto/create-drug.dto';
import * as fs from 'fs';
import * as path from 'path';

interface SeedDrugData {
  drugId: string;
  brandName: string;
  genericName?: string;
  manufacturer: string;
  ndc: string;
  indications?: string;
  warnings?: string;
  dosage?: string;
  contraindications?: string;
  dataSource: string;
  dataVersion?: string;
}

class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);
  private drugsService: DrugsService;
  private fdaService: FdaService;

  async initialize() {
    this.logger.log('Initializing database seeder...');

    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get services
    this.drugsService = app.get(DrugsService);
    this.fdaService = app.get(FdaService);

    this.logger.log('Database seeder initialized successfully');
    return app;
  }

  async loadSeedData(): Promise<SeedDrugData[]> {
    try {
      const seedDataPath = path.join(process.cwd(), 'seed-data.json');

      if (!fs.existsSync(seedDataPath)) {
        throw new Error(`Seed data file not found at: ${seedDataPath}`);
      }

      const seedDataContent = fs.readFileSync(seedDataPath, 'utf8');
      const seedData: SeedDrugData[] = JSON.parse(seedDataContent);

      this.logger.log(`Loaded ${seedData.length} drugs from seed data`);
      return seedData;
    } catch (error) {
      this.logger.error('Failed to load seed data:', error);
      throw error;
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Try to fetch existing drugs to test connection
      const existingDrugs = await this.drugsService.findAll({ limit: 1 });
      this.logger.log('Database connection verified');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      return false;
    }
  }

  async seedDrugs(): Promise<void> {
    try {
      const seedData = await this.loadSeedData();

      // Check database connection
      const isConnected = await this.checkDatabaseConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to database');
      }

      this.logger.log(`Starting to seed ${seedData.length} drugs...`);

      let successCount = 0;
      let errorCount = 0;

      for (const drugData of seedData) {
        try {
          await this.seedSingleDrug(drugData);
          successCount++;

          // Add delay between drugs to avoid overwhelming the system
          await this.delay(2000);
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to seed drug ${drugData.brandName}:`, error.message);

          // Continue with next drug even if one fails
          continue;
        }
      }

      this.logger.log(`Seeding completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      this.logger.error('Seeding process failed:', error);
      throw error;
    }
  }

  private async seedSingleDrug(drugData: SeedDrugData): Promise<void> {
    this.logger.log(`Seeding drug: ${drugData.brandName} (NDC: ${drugData.ndc})`);

    try {
      // Check if drug already exists
      const existingDrugs = await this.drugsService.findAll({
        search: drugData.ndc,
        limit: 1,
      });

      if (existingDrugs.length > 0) {
        this.logger.log(`Drug ${drugData.brandName} already exists, skipping...`);
        return;
      }

      // Create drug DTO
      const createDrugDto: CreateDrugDto = {
        drugId: drugData.drugId,
        brandName: drugData.brandName,
        genericName: drugData.genericName,
        manufacturer: drugData.manufacturer,
        ndc: drugData.ndc,
        dataSource: drugData.dataSource,
        dataVersion: drugData.dataVersion,
        indications: drugData.indications,
        warnings: drugData.warnings,
        dosage: drugData.dosage,
        contraindications: drugData.contraindications,
      };

      // Create the drug - this will trigger MCP enrichment automatically
      const savedDrug = await this.drugsService.create(createDrugDto);

      this.logger.log(`✓ Successfully seeded ${savedDrug.brandName} (ID: ${savedDrug.id})`);

      // Wait a bit for MCP enrichment to process
      this.logger.log(`Waiting for MCP enrichment to process ${savedDrug.brandName}...`);
      await this.delay(5000);
    } catch (error) {
      this.logger.error(`Failed to seed drug ${drugData.brandName}:`, error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForMCPEnrichment(): Promise<void> {
    this.logger.log('Waiting for MCP enrichment processes to complete...');

    // Wait for a reasonable amount of time for enrichment to complete
    // This is a simple approach - in production you might want to poll the database
    await this.delay(30000); // 30 seconds

    this.logger.log('MCP enrichment wait period completed');
  }

  async verifySeeding(): Promise<void> {
    try {
      const allDrugs = await this.drugsService.findAll({ limit: 100 });
      this.logger.log(`Verification: Found ${allDrugs.length} drugs in database`);

      // Check for enriched drugs
      const enrichedDrugs = allDrugs.filter((drug) => drug.enrichment);
      this.logger.log(`Found ${enrichedDrugs.length} drugs with enrichment data`);

      // Check for related drugs
      const drugsWithRelated = allDrugs.filter(
        (drug) => drug.relatedDrugs && drug.relatedDrugs.length > 0,
      );
      this.logger.log(`Found ${drugsWithRelated.length} drugs with related drugs`);
    } catch (error) {
      this.logger.error('Verification failed:', error);
    }
  }
}

async function main() {
  const seeder = new DatabaseSeeder();
  let app;

  try {
    // Initialize the seeder
    app = await seeder.initialize();

    // Wait a bit for all services to be ready
    await seeder.delay(5000);

    // Seed the drugs
    await seeder.seedDrugs();

    // Wait for MCP enrichment to complete
    await seeder.waitForMCPEnrichment();

    // Verify the seeding
    await seeder.verifySeeding();

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the seeder
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DatabaseSeeder };
*/
