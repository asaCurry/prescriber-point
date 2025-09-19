import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { Drug } from './entities/drug.entity';
import { FdaModule } from '../fda/fda.module';

@Module({
  imports: [TypeOrmModule.forFeature([Drug]), FdaModule],
  controllers: [DrugsController],
  providers: [DrugsService],
  exports: [DrugsService],
})
export class DrugsModule {}
