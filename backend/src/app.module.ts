import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';

// ── Auth (FIX: added — global JWT guard applied here) ─────
import { AuthModule } from './modules/auth/auth.module';

// ── Original Modules ──────────────────────────────────────
import { MasterDataModule } from './modules/master-data/master-data.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GeneralLedgerModule } from './modules/general-ledger/general-ledger.module';
import { TaxEngineModule } from './modules/tax-engine/tax-engine.module';

// ── New Feature Modules ───────────────────────────────────
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { AuditModule } from './modules/audit/audit.module';
import { BudgetingModule } from './modules/budgeting/budgeting.module';
import { CashBankModule } from './modules/cash-bank/cash-bank.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CrmModule } from './modules/crm/crm.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HrModule } from './modules/hr/hr.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

// ── Infrastructure ────────────────────────────────────────
import { XmlGeneratorService } from './infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from './infrastructure/validators/tax-validator.service';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
    }),
    PrismaModule,

    // FIX (Bug #1): AuthModule must be first so APP_GUARD registers before all routes
    AuthModule,

    // Feature 1: Accounting & Finance
    MasterDataModule,
    FinanceModule,
    GeneralLedgerModule,
    TaxEngineModule,
    BudgetingModule,

    // Feature 2: Inventory Management
    InventoryModule,

    // Feature 3: Sales Management (Quotation → SO → Invoice)
    SalesModule,
    SalesOrderModule,

    // Feature 4: Purchase / Procurement (PR → PO)
    PurchaseModule,
    ProcurementModule,

    // Feature 5: User & Role + Audit Log
    AuditModule,

    // Feature 6: Dashboard & Reporting
    // Feature 7: Cash & Bank Management
    CashBankModule,

    // Feature 8: Product & Pricing Management
    PricingModule,

    // Feature 9: Basic CRM
    CrmModule,

    // Feature 10: Manufacturing / Production
    ManufacturingModule,

    // Feature 11: Project Management
    ProjectsModule,

    // Feature 12: HR & Payroll
    PayrollModule,
    HrModule,

    // Feature 13: Multi-branch (Branch model di schema, diakses via MasterData)

    // Feature 14: API & Integrations
    IntegrationsModule,
  ],
  controllers: [HealthController],
  providers: [XmlGeneratorService, TaxValidatorService],
  exports: [XmlGeneratorService, TaxValidatorService],
})
export class AppModule {}
