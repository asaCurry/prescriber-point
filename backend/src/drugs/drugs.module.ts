import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { Drug } from './entities/drug.entity';
import { DrugEnrichment } from './entities/drug-enrichment.entity';
import { RelatedDrug } from './entities/related-drug.entity';
import { RelatedDrugsService } from '../ai/services/related-drugs.service';
import { FdaModule } from '../fda/fda.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DrugEnrichment, RelatedDrug]),
    FdaModule,
    CommonModule,
    forwardRef(() => import('../ai/ai.module').then((m) => m.AIModule)),
  ],
  controllers: [DrugsController],
  providers: [DrugsService, RelatedDrugsService],
  exports: [DrugsService],
})
export class DrugsModule {}
