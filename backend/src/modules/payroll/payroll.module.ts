import { Module } from '@nestjs/common';
import { Pph21Service } from './services/pph21.service';
import { Pph21Controller } from './controllers/pph21.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Pph21Controller],
  providers: [Pph21Service],
  exports: [Pph21Service],
})
export class PayrollModule {}
