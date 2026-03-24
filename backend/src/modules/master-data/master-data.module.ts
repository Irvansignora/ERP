import { Module } from '@nestjs/common';
import { PartnerService } from './services/partner.service';
import { ProductService } from './services/product.service';
import { PartnerController } from './controllers/partner.controller';
import { ProductController } from './controllers/product.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { TaxValidatorService } from '@infrastructure/validators/tax-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnerController, ProductController],
  providers: [PartnerService, ProductService, TaxValidatorService],
  exports: [PartnerService, ProductService],
})
export class MasterDataModule {}
