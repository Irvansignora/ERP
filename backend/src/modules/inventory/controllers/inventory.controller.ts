import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from '../services/inventory.service';
import { CurrentUser, AuthUser } from '@modules/auth/decorators/current-user.decorator';

@ApiBearerAuth('JWT')
@ApiTags('Inventory')
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
  createMovement(@Body() body: any, @CurrentUser() user: AuthUser) {
    // FIX (Bug #2): Use real userId from JWT
    return this.inventoryService.createMovement({ ...body, userId: user.id });
  }

  @Get('movements')
  getMovements(@Query() query: any) {
    return this.inventoryService.getMovements(query);
  }
}
