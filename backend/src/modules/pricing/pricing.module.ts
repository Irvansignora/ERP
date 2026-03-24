import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { PricingService } from './services/pricing.service';
import { PricingController } from './controllers/pricing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
