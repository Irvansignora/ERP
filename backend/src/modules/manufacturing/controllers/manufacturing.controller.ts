import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ManufacturingService } from '../services/manufacturing.service';

@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Get('bom')
  getAllBoms() { return this.manufacturingService.getAllBoms(); }

  @Get('bom/:id')
  getBomById(@Param('id') id: string) { return this.manufacturingService.getBomById(id); }

  @Post('bom')
  createBom(@Body() body: any) { return this.manufacturingService.createBom(body); }

  @Get('work-orders')
  getAllWorkOrders(@Query() query: any) { return this.manufacturingService.getAllWorkOrders(query); }

  @Get('work-orders/summary')
  getProductionSummary() { return this.manufacturingService.getProductionSummary(); }

  @Post('work-orders')
  createWorkOrder(@Body() body: any) { return this.manufacturingService.createWorkOrder(body); }

  @Patch('work-orders/:id/status')
  updateWorkOrderStatus(@Param('id') id: string, @Body() body: any) {
    return this.manufacturingService.updateWorkOrderStatus(id, body.status, body.producedQty);
  }
}
