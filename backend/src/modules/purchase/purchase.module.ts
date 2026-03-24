import { Module } from '@nestjs/common';
import { WithholdingSlipService } from './services/withholding-slip.service';
import { WithholdingSlipController } from './controllers/withholding-slip.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { XmlGeneratorService } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from '@infrastructure/validators/tax-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [WithholdingSlipController],
  providers: [WithholdingSlipService, XmlGeneratorService, TaxValidatorService],
  exports: [WithholdingSlipService],
})
export class PurchaseModule {}
