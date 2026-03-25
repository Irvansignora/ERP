import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  // FIX (Bug #3): CORS — never default to wildcard '*'.
  // credentials: true + origin: '*' is rejected by browsers anyway,
  // and is a security misconfiguration. Require explicit origins in env.
  const corsOriginEnv = configService.get<string>('CORS_ORIGIN');

  if (!corsOriginEnv) {
    const isDev = configService.get('NODE_ENV', 'development') === 'development';
    if (!isDev) {
      throw new Error(
        'CORS_ORIGIN env var is required in production. ' +
        'Set it to a comma-separated list of allowed origins, e.g. https://app.yourdomain.com'
      );
    }
    // Dev-only fallback: allow localhost only
    console.warn('⚠️  CORS_ORIGIN not set — allowing localhost only (dev mode)');
  }

  const corsOrigin = corsOriginEnv
    ? corsOriginEnv.includes(',')
      ? corsOriginEnv.split(',').map((o) => o.trim())
      : corsOriginEnv
    : ['http://localhost:3001', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api');
  const apiVersion = configService.get('API_VERSION', 'v1');
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('CoreTax ERP API')
    .setDescription('ERP System with Indonesian CoreTax (CTAS) XML Integration')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token (obtain from your auth provider)',
      },
      'JWT',
    )
    .addTag('Health')
    .addTag('Master Data - Partners')
    .addTag('Sales - Tax Invoices')
    .addTag('Purchase - Withholding')
    .addTag('Payroll - PPh21')
    .addTag('Finance')
    .addTag('Tax Engine - XML Export')
    .addTag('General Ledger')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`🚀 CoreTax ERP Server running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔧 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();
