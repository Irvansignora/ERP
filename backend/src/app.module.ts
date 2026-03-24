import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GeneralLedgerModule } from './modules/general-ledger/general-ledger.module';
import { TaxEngineModule } from './modules/tax-engine/tax-engine.module';
import { XmlGeneratorService } from './infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from './infrastructure/validators/tax-validator.service';
// FIX: HealthController was defined but never registered in any module → 404 on /api/v1/health
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
    }),
    PrismaModule,
    MasterDataModule,
    SalesModule,
    PurchaseModule,
    PayrollModule,
    FinanceModule,
    GeneralLedgerModule,
    TaxEngineModule,
  ],
  controllers: [
    HealthController, // FIX: was missing — health check endpoint now works
  ],
  providers: [
    XmlGeneratorService,
    TaxValidatorService,
  ],
  exports: [
    XmlGeneratorService,
    TaxValidatorService,
  ],
})
export class AppModule {}
