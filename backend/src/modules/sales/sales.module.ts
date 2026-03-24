import { Module } from '@nestjs/common';
import { TaxInvoiceService } from './services/tax-invoice.service';
import { TaxInvoiceController } from './controllers/tax-invoice.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { XmlGeneratorService } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from '@infrastructure/validators/tax-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaxInvoiceController],
  providers: [TaxInvoiceService, XmlGeneratorService, TaxValidatorService],
  exports: [TaxInvoiceService],
})
export class SalesModule {}
