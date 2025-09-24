import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    dataSource = module.get(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return greeting message', () => {
      const result = service.getHello();
      expect(result).toBe('PrescriberPoint API is running!');
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when database is connected', async () => {
      dataSource.query.mockResolvedValue([]);

      const health = await service.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.version).toBeDefined();
      expect(health.environment).toBeDefined();
      expect(health.checks.database).toBe('connected');
      expect(health.checks.memory).toBeDefined();
      expect(health.checks.memory.rss).toBeGreaterThan(0);
      expect(health.checks.memory.heapTotal).toBeGreaterThan(0);
      expect(health.checks.memory.heapUsed).toBeGreaterThan(0);
      expect(health.checks.memory.external).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when database is disconnected', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection failed'));

      const health = await service.getHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.database).toBe('disconnected');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should include environment variables correctly', async () => {
      process.env.NODE_ENV = 'test';
      process.env.npm_package_version = '1.2.3';

      dataSource.query.mockResolvedValue([]);

      const health = await service.getHealth();

      expect(health.environment).toBe('test');
      expect(health.version).toBe('1.2.3');
    });

    it('should use default values when environment variables are not set', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalVersion = process.env.npm_package_version;

      delete process.env.NODE_ENV;
      delete process.env.npm_package_version;

      dataSource.query.mockResolvedValue([]);

      const health = await service.getHealth();

      expect(health.environment).toBe('development');
      expect(health.version).toBe('1.0.0');

      // Restore original values
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
      if (originalVersion !== undefined) process.env.npm_package_version = originalVersion;
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when database and tables are available', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // SELECT 1 query
        .mockResolvedValueOnce([{ count: 0 }]); // COUNT(*) FROM drugs query

      const readiness = await service.getReadiness();

      expect(readiness.status).toBe('ready');
      expect(readiness.timestamp).toBeDefined();
      expect(readiness.checks.database).toBe('ready');
      expect(readiness.checks.memory).toBeDefined();
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM drugs LIMIT 1');
    });

    it('should return not ready status when database connection fails', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection failed'));

      const readiness = await service.getReadiness();

      expect(readiness.status).toBe('not ready');
      expect(readiness.checks.database).toBe('not ready');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return not ready status when drugs table is not available', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // SELECT 1 query succeeds
        .mockRejectedValueOnce(new Error('Table does not exist')); // drugs table query fails

      const readiness = await service.getReadiness();

      expect(readiness.status).toBe('not ready');
      expect(readiness.checks.database).toBe('not ready');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(dataSource.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM drugs LIMIT 1');
    });

    it('should include memory usage information', async () => {
      dataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 5 }]);

      const readiness = await service.getReadiness();

      expect(readiness.checks.memory).toBeDefined();
      expect(readiness.checks.memory.rss).toBeGreaterThan(0);
      expect(readiness.checks.memory.heapTotal).toBeGreaterThan(0);
      expect(readiness.checks.memory.heapUsed).toBeGreaterThan(0);
      expect(readiness.checks.memory.external).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage in MB', () => {
      const memoryUsage = (service as any).getMemoryUsage();

      expect(memoryUsage).toHaveProperty('rss');
      expect(memoryUsage).toHaveProperty('heapTotal');
      expect(memoryUsage).toHaveProperty('heapUsed');
      expect(memoryUsage).toHaveProperty('external');

      expect(typeof memoryUsage.rss).toBe('number');
      expect(typeof memoryUsage.heapTotal).toBe('number');
      expect(typeof memoryUsage.heapUsed).toBe('number');
      expect(typeof memoryUsage.external).toBe('number');

      expect(memoryUsage.rss).toBeGreaterThan(0);
      expect(memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.external).toBeGreaterThanOrEqual(0);
    });

    it('should convert bytes to MB correctly', () => {
      const memoryUsage = (service as any).getMemoryUsage();

      // Values should be reasonable for a Node.js process (in MB)
      expect(memoryUsage.rss).toBeLessThan(1000); // Less than 1GB
      expect(memoryUsage.heapTotal).toBeLessThan(1000);
      expect(memoryUsage.heapUsed).toBeLessThan(memoryUsage.heapTotal);
    });
  });
});
