import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ManufacturingService } from './services/manufacturing.service';
import { ManufacturingController } from './controllers/manufacturing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
