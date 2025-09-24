import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpModule } from '@nestjs-mcp/server';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { EnrichmentController } from './enrichment.controller';
import { DrugEnrichmentResolver } from './drug-enrichment.resolver';
import { EnrichmentService } from './services/enrichment.service';
import { EnrichmentMcpService } from './services/enrichment-mcp.service';
import { IdentifierValidationService } from './services/identifier-validation.service';
import { RelatedDrugsService } from './services/related-drugs.service';
import { AIErrorTrackingService } from './services/ai-error-tracking.service';
import { McpToolsService } from './services/mcp-tools.service';
import { Drug } from '../drugs/entities/drug.entity';
import { DrugEnrichment } from '../drugs/entities/drug-enrichment.entity';
import { RelatedDrug } from '../drugs/entities/related-drug.entity';
import { FdaModule } from '../fda/fda.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DrugEnrichment, RelatedDrug]),
    McpModule.forRoot({
      name: 'prescriber-point-ai',
      version: '1.0.0',
    }),
    FdaModule,
    forwardRef(() => import('../drugs/drugs.module').then((m) => m.DrugsModule)),
    CommonModule,
  ],
  providers: [
    AIService,
    DrugEnrichmentResolver,
    EnrichmentService,
    EnrichmentMcpService,
    IdentifierValidationService,
    RelatedDrugsService,
    AIErrorTrackingService,
    McpToolsService,
  ],
  controllers: [AIController, EnrichmentController],
  exports: [
    AIService,
    DrugEnrichmentResolver,
    EnrichmentService,
    EnrichmentMcpService,
    IdentifierValidationService,
    RelatedDrugsService,
    AIErrorTrackingService,
    McpToolsService,
  ],
})
export class AIModule {}
