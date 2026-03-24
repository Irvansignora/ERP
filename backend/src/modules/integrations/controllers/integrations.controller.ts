import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IntegrationsService } from '../services/integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // Payment Gateway
  @Post('payment/charge')
  createCharge(@Body() body: any) {
    return this.integrationsService.createPaymentGatewayCharge(body);
  }

  @Get('payment/status/:provider/:transactionId')
  checkPaymentStatus(
    @Param('provider') provider: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.integrationsService.checkPaymentStatus(provider, transactionId);
  }

  // Marketplace
  @Post('marketplace/sync')
  syncMarketplaceOrders(@Body() body: any) {
    return this.integrationsService.syncMarketplaceOrders(body.provider, {
      fromDate: new Date(body.fromDate),
      toDate: new Date(body.toDate),
    });
  }

  // Shipping
  @Post('shipping/rates')
  checkShippingRate(@Body() body: any) {
    return this.integrationsService.checkShippingRate(body);
  }

  @Post('shipping/shipment')
  createShipment(@Body() body: any) {
    return this.integrationsService.createShipment(body);
  }

  @Get('shipping/track/:provider/:awbNumber')
  trackShipment(@Param('provider') provider: string, @Param('awbNumber') awbNumber: string) {
    return this.integrationsService.trackShipment(provider, awbNumber);
  }

  // Logs
  @Get('logs')
  getIntegrationLogs(@Query() query: any) {
    return this.integrationsService.getIntegrationLogs(query);
  }

  @Get('summary')
  getIntegrationSummary() {
    return this.integrationsService.getIntegrationSummary();
  }
}
