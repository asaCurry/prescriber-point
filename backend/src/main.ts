import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS with proper configuration
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Global validation pipe with better error handling
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const result = errors.map((error) => ({
            property: error.property,
            value: error.value,
            constraints: error.constraints,
          }));
          return new Error(`Validation failed: ${JSON.stringify(result)}`);
        },
      }),
    );

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('PrescriberPoint API')
      .setDescription('AI-Enhanced Drug Information Platform API')
      .setVersion('1.0')
      .addTag('health', 'Health check endpoints')
      .addTag('drugs', 'Drug information management')
      .addTag('fda', 'FDA data integration')
      .addTag('ai', 'AI-powered drug enrichment')
      .addTag('enrichment', 'Drug data enrichment services')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Graceful shutdown handling
    app.enableShutdownHooks();

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api`);
    logger.log(`🏥 Health Check: http://localhost:${port}/health`);
  } catch (error) {
    logger.error('❌ Failed to start application', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();
