import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { Drug } from './entities/drug.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Drug])],
  controllers: [DrugsController],
  providers: [DrugsService],
  exports: [DrugsService],
})
export class DrugsModule {}