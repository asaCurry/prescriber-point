import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpModule } from '@nestjs-mcp/server';
import { AIService } from './ai.service';
import { DrugEnrichmentResolver } from './drug-enrichment.resolver';
import { EnrichmentMcpService } from './services/enrichment-mcp.service';
import { IdentifierValidationService } from './services/identifier-validation.service';
import { AIErrorTrackingService } from './services/ai-error-tracking.service';
import { McpToolsService } from './services/mcp-tools.service';
import { FdaService } from '../fda/fda.service';
import { Drug } from '../drugs/entities/drug.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Drug]),
    McpModule.forRoot({
      name: 'prescriber-point-ai',
      version: '1.0.0',
    }),
  ],
  providers: [
    AIService,
    EnrichmentMcpService,
    IdentifierValidationService,
    AIErrorTrackingService,
    McpToolsService,
    DrugEnrichmentResolver,
    FdaService,
  ],
  exports: [AIService, EnrichmentMcpService, IdentifierValidationService, McpToolsService],
})
export class AIMcpModule {}
