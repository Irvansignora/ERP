import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async logIntegration(data: {
    integrationType: string;
    provider: string;
    direction: string;
    endpoint?: string;
    requestPayload?: any;
    responsePayload?: any;
    statusCode?: number;
    status: string;
    errorMessage?: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    return this.prisma.integrationLog.create({ data });
  }

  // ── Payment Gateway (Midtrans / Xendit) ──────────────────
  async createPaymentGatewayCharge(dto: {
    provider: 'MIDTRANS' | 'XENDIT';
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    paymentMethod?: string;
  }) {
    const endpoint = `/v2/charge`;
    const requestPayload = {
      order_id: dto.orderId,
      gross_amount: dto.amount,
      customer_details: { name: dto.customerName, email: dto.customerEmail },
      payment_type: dto.paymentMethod ?? 'bank_transfer',
    };

    try {
      // NOTE: Replace with real Midtrans/Xendit SDK call in production
      // const response = await midtransClient.charge(requestPayload);
      const mockResponse = {
        transaction_id: `TXN-${Date.now()}`,
        order_id: dto.orderId,
        status_code: '201',
        payment_type: dto.paymentMethod ?? 'bank_transfer',
        va_numbers: [{ bank: 'bca', va_number: '12345678901234' }],
      };

      await this.logIntegration({
        integrationType: 'PAYMENT_GATEWAY',
        provider: dto.provider,
        direction: 'OUTBOUND',
        endpoint,
        requestPayload,
        responsePayload: mockResponse,
        statusCode: 201,
        status: 'SUCCESS',
        referenceId: dto.orderId,
        referenceType: 'SALES_ORDER',
      });

      return mockResponse;
    } catch (err: any) {
      await this.logIntegration({
        integrationType: 'PAYMENT_GATEWAY',
        provider: dto.provider,
        direction: 'OUTBOUND',
        endpoint,
        requestPayload,
        status: 'FAILED',
        errorMessage: err.message,
        referenceId: dto.orderId,
        referenceType: 'SALES_ORDER',
      });
      throw err;
    }
  }

  async checkPaymentStatus(provider: string, transactionId: string) {
    const mockStatus = {
      transaction_id: transactionId,
      transaction_status: 'settlement',
      settlement_time: new Date().toISOString(),
      gross_amount: '0',
    };
    await this.logIntegration({
      integrationType: 'PAYMENT_GATEWAY',
      provider,
      direction: 'OUTBOUND',
      endpoint: `/v2/${transactionId}/status`,
      responsePayload: mockStatus,
      statusCode: 200,
      status: 'SUCCESS',
      referenceId: transactionId,
    });
    return mockStatus;
  }

  // ── Marketplace (Tokopedia / Shopee) ─────────────────────
  async syncMarketplaceOrders(provider: 'TOKOPEDIA' | 'SHOPEE', params: { fromDate: Date; toDate: Date }) {
    const endpoint = `/api/orders`;
    try {
      // NOTE: Replace with real marketplace SDK call in production
      const mockOrders = [
        {
          order_id: `MKT-${Date.now()}`,
          provider,
          status: 'NEW',
          total: 500000,
          items: [],
          buyer: { name: 'Customer Marketplace', email: 'buyer@example.com' },
        },
      ];

      await this.logIntegration({
        integrationType: 'MARKETPLACE',
        provider,
        direction: 'INBOUND',
        endpoint,
        requestPayload: params,
        responsePayload: mockOrders,
        statusCode: 200,
        status: 'SUCCESS',
      });

      return { synced: mockOrders.length, orders: mockOrders };
    } catch (err: any) {
      await this.logIntegration({
        integrationType: 'MARKETPLACE',
        provider,
        direction: 'INBOUND',
        endpoint,
        requestPayload: params,
        status: 'FAILED',
        errorMessage: err.message,
      });
      throw err;
    }
  }

  // ── Shipping / Ekspedisi (JNE / SiCepat / JnT) ───────────
  async checkShippingRate(dto: {
    provider: 'JNE' | 'SICEPAT' | 'JNT' | 'ANTERAJA';
    origin: string;
    destination: string;
    weight: number; // grams
    service?: string;
  }) {
    const endpoint = `/tariff`;
    const mockRates = [
      { service: 'REG', etd: '2-3 hari', cost: 18000 },
      { service: 'YES', etd: '1-2 hari', cost: 32000 },
      { service: 'OKE', etd: '4-5 hari', cost: 12000 },
    ];

    await this.logIntegration({
      integrationType: 'SHIPPING',
      provider: dto.provider,
      direction: 'OUTBOUND',
      endpoint,
      requestPayload: dto,
      responsePayload: mockRates,
      statusCode: 200,
      status: 'SUCCESS',
    });

    return { provider: dto.provider, rates: mockRates };
  }

  async createShipment(dto: {
    provider: string;
    orderId: string;
    service: string;
    senderName: string;
    senderAddress: string;
    receiverName: string;
    receiverAddress: string;
    weight: number;
    description: string;
  }) {
    const mockAWB = `AWB${dto.provider}${Date.now()}`;
    const mockResult = {
      awb_number: mockAWB,
      order_id: dto.orderId,
      status: 'CREATED',
      estimated_delivery: '2-3 hari',
    };

    await this.logIntegration({
      integrationType: 'SHIPPING',
      provider: dto.provider,
      direction: 'OUTBOUND',
      endpoint: '/shipment',
      requestPayload: dto,
      responsePayload: mockResult,
      statusCode: 201,
      status: 'SUCCESS',
      referenceId: dto.orderId,
      referenceType: 'SALES_ORDER',
    });

    return mockResult;
  }

  async trackShipment(provider: string, awbNumber: string) {
    const mockTracking = {
      awb_number: awbNumber,
      status: 'IN_TRANSIT',
      history: [
        { date: new Date().toISOString(), location: 'Jakarta Timur', description: 'Paket diterima kurir' },
        { date: new Date().toISOString(), location: 'Hub Jakarta', description: 'Paket tiba di hub' },
      ],
    };

    await this.logIntegration({
      integrationType: 'SHIPPING',
      provider,
      direction: 'OUTBOUND',
      endpoint: `/track/${awbNumber}`,
      responsePayload: mockTracking,
      statusCode: 200,
      status: 'SUCCESS',
      referenceId: awbNumber,
    });

    return mockTracking;
  }

  // ── Integration Logs ─────────────────────────────────────
  async getIntegrationLogs(params: {
    integrationType?: string;
    provider?: string;
    status?: string;
    limit?: number;
  }) {
    return this.prisma.integrationLog.findMany({
      where: {
        ...(params.integrationType && { integrationType: params.integrationType }),
        ...(params.provider && { provider: params.provider }),
        ...(params.status && { status: params.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async getIntegrationSummary() {
    const logs = await this.prisma.integrationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const byType: Record<string, { total: number; success: number; failed: number }> = {};
    for (const log of logs) {
      if (!byType[log.integrationType]) byType[log.integrationType] = { total: 0, success: 0, failed: 0 };
      byType[log.integrationType].total++;
      if (log.status === 'SUCCESS') byType[log.integrationType].success++;
      else byType[log.integrationType].failed++;
    }

    return { total: logs.length, byType };
  }
}
