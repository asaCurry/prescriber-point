import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrugsModule } from './drugs/drugs.module';
import { FdaModule } from './fda/fda.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'postgres',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'prescriber_point',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production', // Only sync in development
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Connection retry configuration
      retryAttempts: 3,
      retryDelay: 3000,
      // Connection pool configuration
      extra: {
        max: 20, // Maximum number of connections in the pool
        min: 5, // Minimum number of connections in the pool
        acquire: 30000, // Maximum time to wait for a connection
        idle: 10000, // Maximum time a connection can be idle
      },
      // Error handling - use retry configuration instead
      toRetry: (error) => {
        console.error('Database connection error:', error);
        return true; // Retry on any error
      },
    }),
    DrugsModule,
    FdaModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
