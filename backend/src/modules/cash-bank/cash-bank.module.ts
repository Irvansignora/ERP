import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { CashBankService } from './services/cash-bank.service';
import { CashBankController } from './controllers/cash-bank.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CashBankController],
  providers: [CashBankService],
  exports: [CashBankService],
})
export class CashBankModule {}
