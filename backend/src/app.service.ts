import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  getHello(): string {
    return 'PrescriberPoint API is running!';
  }

  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'unknown',
        memory: this.getMemoryUsage(),
      },
    };

    try {
      // Check database connection
      await this.dataSource.query('SELECT 1');
      health.checks.database = 'connected';
    } catch (error) {
      this.logger.error('Database health check failed', error);
      health.checks.database = 'disconnected';
      health.status = 'unhealthy';
    }

    return health;
  }

  async getReadiness() {
    const readiness = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        memory: this.getMemoryUsage(),
      },
    };

    try {
      // Check if database is ready and migrations are up to date
      await this.dataSource.query('SELECT 1');

      // Check if we can query the drugs table (basic table existence check)
      await this.dataSource.query('SELECT COUNT(*) FROM drugs LIMIT 1');

      readiness.checks.database = 'ready';
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      readiness.checks.database = 'not ready';
      readiness.status = 'not ready';
    }

    return readiness;
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    };
  }
}
