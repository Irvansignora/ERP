import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesOrderService } from '../services/sales-order.service';
import { CurrentUser, AuthUser } from '@modules/auth/decorators/current-user.decorator';

@ApiBearerAuth('JWT')
@ApiTags('Sales - Sales Orders')
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('quotations')
  getAllQuotations(@Query() query: any) {
    return this.salesOrderService.getAllQuotations(query);
  }

  @Post('quotations')
  createQuotation(@Body() body: any, @CurrentUser() user: AuthUser) {
    // FIX (Bug #2): Use real userId from JWT
    return this.salesOrderService.createQuotation({ ...body, userId: user.id });
  }

  @Post('quotations/:id/convert')
  convertToSalesOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesOrderService.convertToSalesOrder(id, user.id);
  }

  @Get()
  getAllSalesOrders(@Query() query: any) {
    return this.salesOrderService.getAllSalesOrders(query);
  }

  @Get('summary')
  getSalesSummary(@Query('period') period: string) {
    return this.salesOrderService.getSalesSummary(period);
  }

  @Get(':id')
  getSalesOrderById(@Param('id') id: string) {
    return this.salesOrderService.getSalesOrderById(id);
  }

  @Post(':id/confirm')
  confirmSalesOrder(@Param('id') id: string) {
    return this.salesOrderService.confirmSalesOrder(id);
  }
}
