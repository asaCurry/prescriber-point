#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AIMcpModule } from './ai/ai-mcp.module';

async function bootstrap() {
  try {
    console.log('🚀 Starting MCP Server...');

    // Validate environment
    const optionalEnvVars = [
      'ANTHROPIC_API_KEY',
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_NAME',
      'DATABASE_USER',
      'DATABASE_PASSWORD',
    ];

    console.log('🔍 Checking environment configuration...');
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set`);
      } else {
        console.log(`⚠️  ${envVar}: Not set (optional)`);
      }
    }

    // Create application context with error handling
    const app = await NestFactory.createApplicationContext(AIMcpModule, {
      logger: ['error', 'warn', 'log'],
    });

    console.log('✅ MCP Server started successfully!');
    console.log('📍 Server Name: prescriber-point-ai');
    console.log('📋 Available Tools:');
    console.log('  - enrich_drugs_batch: Batch drug enrichment with validation');
    console.log('  - validate_drug_identifiers: Identifier validation only');
    console.log('  - validate_related_drugs_against_fda: FDA validation for related drugs');
    console.log('  - save_related_drugs: Save validated related drugs to database');
    console.log('  - get_related_drugs: Retrieve related drugs from database');
    console.log('  - fetch_fda_drug_data: Fetch FDA data with retries and fallbacks');
    console.log('  - enrich_drug_data: Legacy enrichment tool');
    console.log('');
    console.log('💡 Connect your MCP client to this server to use the tools');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down MCP Server...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down MCP Server...');
      await app.close();
      process.exit(0);
    });

    // Keep the application running
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Failed to start MCP Server:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check if all required environment variables are set');
    console.error('  2. Ensure database is accessible (if using database features)');
    console.error('  3. Verify ANTHROPIC_API_KEY is set for AI features');
    console.error('  4. Check network connectivity for external API calls');
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Unhandled error in MCP Server:', error);
  process.exit(1);
});
