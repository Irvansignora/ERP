import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BudgetingService } from './services/budgeting.service';
import { BudgetingController } from './controllers/budgeting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetingController],
  providers: [BudgetingService],
  exports: [BudgetingService],
})
export class BudgetingModule {}
