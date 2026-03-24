import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { HrService } from './services/hr.service';
import { HrController } from './controllers/hr.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
