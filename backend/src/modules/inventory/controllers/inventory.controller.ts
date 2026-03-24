import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouses')
  getAllWarehouses() {
    return this.inventoryService.getAllWarehouses();
  }

  @Post('warehouses')
  createWarehouse(@Body() body: any) {
    return this.inventoryService.createWarehouse(body);
  }

  @Get('stock/:warehouseId')
  getStockByWarehouse(@Param('warehouseId') warehouseId: string) {
    return this.inventoryService.getStockByWarehouse(warehouseId);
  }

  @Get('stock-summary/:productId')
  getStockSummary(@Param('productId') productId: string) {
    return this.inventoryService.getStockSummary(productId);
  }

  @Get('low-stock-alerts')
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Post('movements')
  createMovement(@Body() body: any) {
    return this.inventoryService.createMovement(body);
  }

  @Get('movements')
  getMovements(@Query() query: any) {
    return this.inventoryService.getMovements(query);
  }
}
