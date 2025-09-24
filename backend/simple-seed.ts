import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './src/app.module';
import { DrugsService } from './src/drugs/drugs.service';
import { CreateDrugDto } from './src/drugs/dto/create-drug.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

class SimpleSeeder {
  private readonly logger = new Logger(SimpleSeeder.name);
  private drugsService: DrugsService;

  async promptForApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('\n🔑 ANTHROPIC_API_KEY not found!');
      console.log('📋 To enable AI enrichment features, you can:');
      console.log('');
      console.log('   1. Enter your API key now (will be used for this session only)');
      console.log('   2. Press Enter to continue without API key (limited AI features)');
      console.log('');
      console.log('🌐 Get your API key from: https://console.anthropic.com/');
      console.log('');

      rl.question('Enter your Anthropic API key (or press Enter to skip): ', (answer) => {
        rl.close();

        if (answer.trim()) {
          console.log('✅ API key provided - AI enrichment enabled');
          resolve(answer.trim());
        } else {
          console.log('⚠️  Continuing without API key - AI enrichment will be limited');
          resolve(null);
        }
      });
    });
  }

  checkApiKey() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log('\n🔑 ANTHROPIC_API_KEY not found!');
      console.log('📋 To enable AI enrichment features, set your API key:');
      console.log('');
      console.log('   Option 1 - Environment variable:');
      console.log('   export ANTHROPIC_API_KEY=sk-ant-your-actual-key-here');
      console.log('');
      console.log('   Option 2 - Inline with command:');
      console.log('   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here npm run seed:simple');
      console.log('');
      console.log('   Option 3 - Create .env file:');
      console.log('   echo "ANTHROPIC_API_KEY=sk-ant-your-actual-key-here" > .env');
      console.log('');
      console.log('🌐 Get your API key from: https://console.anthropic.com/');
      console.log('');
      console.log('⚠️  Continuing without API key - AI enrichment will be limited');
      console.log('');
    } else {
      console.log('✅ ANTHROPIC_API_KEY found - AI enrichment enabled');
    }
  }

  async initialize(interactive = false) {
    this.logger.log('🚀 Initializing simple seeder...');

    // Check for API key and provide guidance
    if (!process.env.ANTHROPIC_API_KEY) {
      if (interactive) {
        const apiKey = await this.promptForApiKey();
        if (apiKey) {
          process.env.ANTHROPIC_API_KEY = apiKey;
        }
      } else {
        this.checkApiKey();
      }
    } else {
      console.log('✅ ANTHROPIC_API_KEY found - AI enrichment enabled');
    }

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    this.drugsService = app.get(DrugsService);
    this.logger.log('✅ Seeder initialized successfully');
    return app;
  }

  async loadSeedData(): Promise<SeedDrugData[]> {
    const seedDataPath = path.join(process.cwd(), 'seed-data.json');

    if (!fs.existsSync(seedDataPath)) {
      throw new Error(`Seed data file not found at: ${seedDataPath}`);
    }

    const seedDataContent = fs.readFileSync(seedDataPath, 'utf8');
    const seedData: SeedDrugData[] = JSON.parse(seedDataContent);

    this.logger.log(`📄 Loaded ${seedData.length} drugs from seed data`);
    return seedData;
  }

  async seedDrugs(): Promise<void> {
    try {
      const seedData = await this.loadSeedData();

      this.logger.log(`🌱 Starting to seed ${seedData.length} drugs...`);

      let successCount = 0;
      let errorCount = 0;

      for (const drugData of seedData) {
        try {
          await this.seedSingleDrug(drugData);
          successCount++;

          // Small delay between drugs
          await this.delay(1000);
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Failed to seed drug ${drugData.brandName}:`, error.message);
        }
      }

      this.logger.log(`🎉 Seeding completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      this.logger.error('💥 Seeding process failed:', error);
      throw error;
    }
  }

  private async seedSingleDrug(drugData: SeedDrugData): Promise<void> {
    this.logger.log(`💊 Seeding: ${drugData.brandName} (NDC: ${drugData.ndc})`);

    // Check if drug already exists
    const existingDrugs = await this.drugsService.findAll({
      search: drugData.ndc,
      limit: 1,
    });

    if (existingDrugs.length > 0) {
      this.logger.log(`⏭️  Drug ${drugData.brandName} already exists, skipping...`);
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

    this.logger.log(`✅ Successfully seeded ${savedDrug.brandName} (ID: ${savedDrug.id})`);
    this.logger.log(`🤖 MCP enrichment will process ${savedDrug.brandName} in the background...`);
  }

  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifySeeding(): Promise<void> {
    try {
      const allDrugs = await this.drugsService.findAll({ limit: 100 });
      this.logger.log(`📊 Verification: Found ${allDrugs.length} drugs in database`);

      const enrichedDrugs = allDrugs.filter((drug) => drug.enrichment);
      this.logger.log(`🎯 Found ${enrichedDrugs.length} drugs with enrichment data`);

      const drugsWithRelated = allDrugs.filter(
        (drug) => drug.relatedDrugs && drug.relatedDrugs.length > 0,
      );
      this.logger.log(`🔗 Found ${drugsWithRelated.length} drugs with related drugs`);
    } catch (error) {
      this.logger.error('❌ Verification failed:', error);
    }
  }
}

async function main() {
  // Show help if requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('\n🌱 PrescriberPoint Database Seeder');
    console.log('');
    console.log('Usage:');
    console.log('  npm run seed:simple          - Run seeder with API key guidance');
    console.log('  npm run seed:interactive     - Run seeder with interactive API key prompt');
    console.log('');
    console.log('Options:');
    console.log('  --interactive, -i            - Prompt for API key interactively');
    console.log('  --help, -h                    - Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  ANTHROPIC_API_KEY            - Anthropic API key for AI enrichment');
    console.log('');
    return;
  }

  const seeder = new SimpleSeeder();
  let app;

  // Check if interactive mode is requested
  const interactive = process.argv.includes('--interactive') || process.argv.includes('-i');

  try {
    // Initialize the seeder
    app = await seeder.initialize(interactive);

    // Wait a moment for services to be ready
    await seeder.delay(2000);

    // Seed the drugs
    await seeder.seedDrugs();

    // Verify the seeding
    await seeder.verifySeeding();

    console.log('🎉 Database seeding completed successfully!');
    console.log(
      '💡 Note: MCP enrichment happens in the background and may take a few minutes to complete.',
    );
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
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { SimpleSeeder };
