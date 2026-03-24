import { Module } from '@nestjs/common';
import { XmlExportService } from './services/xml-export.service';
import { XmlExportController } from './controllers/xml-export.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { XmlGeneratorService } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService } from '@infrastructure/validators/tax-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [XmlExportController],
  providers: [XmlExportService, XmlGeneratorService, TaxValidatorService],
  exports: [XmlExportService],
})
export class TaxEngineModule {}
