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
  app.use(helmet({ contentSecurityPolicy: false })); // FIX: contentSecurityPolicy disabled — was blocking Swagger UI
  app.use(compression());

  // FIX: CORS was hardcoded to localhost:3001 — breaks on Vercel deployment
  // Now supports comma-separated origins via env var, with Vercel wildcard fallback
  const corsOriginEnv = configService.get<string>('CORS_ORIGIN', '*');
  const corsOrigin = corsOriginEnv.includes(',')
    ? corsOriginEnv.split(',').map((o) => o.trim())
    : corsOriginEnv;

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
  app.useGlobalPipe(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CoreTax ERP API')
    .setDescription('ERP System with Indonesian CoreTax (CTAS) XML Integration')
    .setVersion('1.0.0')
    .addBearerAuth()
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

  // Start server
  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`🚀 CoreTax ERP Server running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔧 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();
