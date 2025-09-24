import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const mockAppService = {
  getHello: jest.fn(),
  getHealth: jest.fn(),
  getReadiness: jest.fn(),
};

const mockHealthResponse = {
  status: 'healthy',
  timestamp: '2023-01-01T00:00:00.000Z',
  uptime: 123.45,
  version: '1.0.0',
  environment: 'test',
  checks: {
    database: 'connected',
    memory: {
      rss: 50,
      heapTotal: 30,
      heapUsed: 20,
      external: 5,
    },
  },
};

const mockReadinessResponse = {
  status: 'ready',
  timestamp: '2023-01-01T00:00:00.000Z',
  checks: {
    database: 'ready',
    memory: {
      rss: 50,
      heapTotal: 30,
      heapUsed: 20,
      external: 5,
    },
  },
};

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return greeting message', () => {
      const expectedMessage = 'PrescriberPoint API is running!';
      mockAppService.getHello.mockReturnValue(expectedMessage);

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });
  });

  describe('getHealth', () => {
    it('should return health status when service is healthy', async () => {
      mockAppService.getHealth.mockResolvedValue(mockHealthResponse);

      const result = await controller.getHealth();

      expect(appService.getHealth).toHaveBeenCalled();
      expect(result).toEqual(mockHealthResponse);
    });

    it('should throw SERVICE_UNAVAILABLE when health check fails', async () => {
      const error = new Error('Database connection failed');
      mockAppService.getHealth.mockRejectedValue(error);

      await expect(controller.getHealth()).rejects.toThrow(
        new HttpException(
          {
            status: 'unhealthy',
            error: 'Database connection failed',
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );

      expect(appService.getHealth).toHaveBeenCalled();
    });

    it('should include timestamp in error response', async () => {
      const error = new Error('Service error');
      mockAppService.getHealth.mockRejectedValue(error);

      try {
        await controller.getHealth();
        fail('Expected HttpException to be thrown');
      } catch (exception) {
        expect(exception).toBeInstanceOf(HttpException);
        expect(exception.getResponse()).toMatchObject({
          status: 'unhealthy',
          error: 'Service error',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        });
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should handle undefined error message', async () => {
      const error = new Error();
      error.message = undefined as any;
      mockAppService.getHealth.mockRejectedValue(error);

      await expect(controller.getHealth()).rejects.toThrow(
        new HttpException(
          {
            status: 'unhealthy',
            error: undefined,
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should handle non-Error objects', async () => {
      const error = 'String error';
      mockAppService.getHealth.mockRejectedValue(error);

      try {
        await controller.getHealth();
        fail('Expected HttpException to be thrown');
      } catch (exception) {
        expect(exception).toBeInstanceOf(HttpException);
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status when service is ready', async () => {
      mockAppService.getReadiness.mockResolvedValue(mockReadinessResponse);

      const result = await controller.getReadiness();

      expect(appService.getReadiness).toHaveBeenCalled();
      expect(result).toEqual(mockReadinessResponse);
    });

    it('should throw SERVICE_UNAVAILABLE when readiness check fails', async () => {
      const error = new Error('Database not ready');
      mockAppService.getReadiness.mockRejectedValue(error);

      await expect(controller.getReadiness()).rejects.toThrow(
        new HttpException(
          {
            status: 'not ready',
            error: 'Database not ready',
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );

      expect(appService.getReadiness).toHaveBeenCalled();
    });

    it('should include timestamp in readiness error response', async () => {
      const error = new Error('Tables not available');
      mockAppService.getReadiness.mockRejectedValue(error);

      try {
        await controller.getReadiness();
        fail('Expected HttpException to be thrown');
      } catch (exception) {
        expect(exception).toBeInstanceOf(HttpException);
        expect(exception.getResponse()).toMatchObject({
          status: 'not ready',
          error: 'Tables not available',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        });
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should handle migration errors', async () => {
      const error = new Error('Migration pending');
      mockAppService.getReadiness.mockRejectedValue(error);

      await expect(controller.getReadiness()).rejects.toThrow(
        new HttpException(
          {
            status: 'not ready',
            error: 'Migration pending',
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      mockAppService.getReadiness.mockRejectedValue(error);

      await expect(controller.getReadiness()).rejects.toThrow(
        new HttpException(
          {
            status: 'not ready',
            error: 'Request timeout',
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should handle undefined error message in readiness', async () => {
      const error = new Error();
      error.message = undefined as any;
      mockAppService.getReadiness.mockRejectedValue(error);

      await expect(controller.getReadiness()).rejects.toThrow(
        new HttpException(
          {
            status: 'not ready',
            error: undefined,
            timestamp: expect.any(String),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });
});
