import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PricingService } from '../services/pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('price-lists')
  getAllPriceLists(@Query() query: any) {
    return this.pricingService.getAllPriceLists(query);
  }

  @Post('price-lists')
  createPriceList(@Body() body: any) {
    return this.pricingService.createPriceList(body);
  }

  @Get('product-price/:productId')
  getPriceForProduct(
    @Param('productId') productId: string,
    @Query('type') type: any,
    @Query('qty') qty: string,
  ) {
    return this.pricingService.getPriceForProduct(productId, type, qty ? parseFloat(qty) : 1);
  }

  @Post('price-lists/:id/deactivate')
  deactivatePriceList(@Param('id') id: string) {
    return this.pricingService.deactivatePriceList(id);
  }
}
