import { Module } from '@nestjs/common';
import { TaxEngineService } from './services/tax-engine.service';
import { TaxEngineController } from './controllers/tax-engine.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { XmlGeneratorService } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from '@infrastructure/validators/tax-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaxEngineController],
  providers: [TaxEngineService, XmlGeneratorService, TaxValidatorService],
  exports: [TaxEngineService],
})
export class FinanceModule {}
