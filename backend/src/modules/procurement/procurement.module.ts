import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ProcurementService } from './services/procurement.service';
import { ProcurementController } from './controllers/procurement.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
