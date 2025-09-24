import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { FdaService } from './fda.service';
import { Drug } from '../drugs/entities/drug.entity';
import { DrugEnrichment } from '../drugs/entities/drug-enrichment.entity';
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Drug, DrugEnrichment])],
  providers: [FdaService],
  exports: [FdaService],
})
export class FdaModule {}
