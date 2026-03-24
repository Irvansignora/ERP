import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from '../services/integrations.service';

@ApiBearerAuth('JWT')
@ApiTags('API & Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

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

  @Post('marketplace/sync')
  syncMarketplaceOrders(@Body() body: any) {
    return this.integrationsService.syncMarketplaceOrders(body.provider, {
      fromDate: new Date(body.fromDate),
      toDate: new Date(body.toDate),
    });
  }

  @Post('shipping/rates')
  checkShippingRate(@Body() body: any) {
    return this.integrationsService.checkShippingRate(body);
  }

  @Post('shipping/shipment')
  createShipment(@Body() body: any) {
    return this.integrationsService.createShipment(body);
  }

  @Get('shipping/track/:provider/:awbNumber')
  trackShipment(
    @Param('provider') provider: string,
    @Param('awbNumber') awbNumber: string,
  ) {
    return this.integrationsService.trackShipment(provider, awbNumber);
  }

  @Get('logs')
  getIntegrationLogs(@Query() query: any) {
    return this.integrationsService.getIntegrationLogs(query);
  }

  @Get('summary')
  getIntegrationSummary() {
    return this.integrationsService.getIntegrationSummary();
  }
}
