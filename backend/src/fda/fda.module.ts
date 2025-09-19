import { Module } from '@nestjs/common';
import { FdaService } from './fda.service';

@Module({
  providers: [FdaService],
  exports: [FdaService],
})
export class FdaModule {}
