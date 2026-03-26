// Path aliases (@domain/*, @infrastructure/*, etc.) are registered automatically
// by ts-node via the "ts-node": { "require": ["tsconfig-paths/register"] } in tsconfig.json.
// The manual registration below is a fallback for environments where ts-node
// config is not picked up (e.g. plain node running compiled .js files).
import * as tsConfigPaths from 'tsconfig-paths';
import * as path from 'path';

const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
const tsConfig = tsConfigPaths.loadConfig(tsconfigPath) as any;
if (tsConfig.resultType !== 'failed') {
  tsConfigPaths.register({
    baseUrl: tsConfig.absoluteBaseUrl,
    paths: tsConfig.paths,
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '../src/app.module';

let cachedApp: any;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const apiPrefix = configService.get('API_PREFIX', 'api');
  const apiVersion = configService.get('API_VERSION', 'v1');
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

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

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  expressInstance(req, res);
}
