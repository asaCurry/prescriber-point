import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrugsModule } from './drugs/drugs.module';
import { FdaModule } from './fda/fda.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'prescriber_point',
      autoLoadEntities: true,
      synchronize: true, // This will automatically create/update the database schema
      logging: process.env.NODE_ENV === 'development',
    }),
    DrugsModule,
    FdaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
