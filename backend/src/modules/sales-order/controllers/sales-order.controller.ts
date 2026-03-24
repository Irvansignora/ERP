import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SalesOrderService } from '../services/sales-order.service';

@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('quotations')
  getAllQuotations(@Query() query: any) {
    return this.salesOrderService.getAllQuotations(query);
  }

  @Post('quotations')
  createQuotation(@Body() body: any) {
    return this.salesOrderService.createQuotation(body);
  }

  @Post('quotations/:id/convert')
  convertToSalesOrder(@Param('id') id: string, @Body() body: any) {
    return this.salesOrderService.convertToSalesOrder(id, body.userId);
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
