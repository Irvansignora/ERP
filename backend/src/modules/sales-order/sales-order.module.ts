import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { SalesOrderService } from './services/sales-order.service';
import { SalesOrderController } from './controllers/sales-order.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
  exports: [SalesOrderService],
})
export class SalesOrderModule {}
