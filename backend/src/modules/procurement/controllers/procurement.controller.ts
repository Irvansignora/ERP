import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProcurementService } from '../services/procurement.service';

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('purchase-requests')
  getAllPurchaseRequests(@Query() query: any) {
    return this.procurementService.getAllPurchaseRequests(query);
  }

  @Post('purchase-requests')
  createPurchaseRequest(@Body() body: any) {
    return this.procurementService.createPurchaseRequest(body);
  }

  @Post('purchase-requests/:id/approve')
  approvePurchaseRequest(@Param('id') id: string) {
    return this.procurementService.approvePurchaseRequest(id);
  }

  @Get('purchase-orders')
  getAllPurchaseOrders(@Query() query: any) {
    return this.procurementService.getAllPurchaseOrders(query);
  }

  @Get('purchase-orders/summary')
  getPurchaseSummary() {
    return this.procurementService.getPurchaseSummary();
  }

  @Get('purchase-orders/:id')
  getPurchaseOrderById(@Param('id') id: string) {
    return this.procurementService.getPurchaseOrderById(id);
  }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() body: any) {
    return this.procurementService.createPurchaseOrder(body);
  }

  @Post('purchase-orders/:id/confirm')
  confirmPurchaseOrder(@Param('id') id: string) {
    return this.procurementService.confirmPurchaseOrder(id);
  }
}
