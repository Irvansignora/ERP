import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
    try {
      return await this.prisma.integrationLog.create({ data });
    } catch (err) {
      // Log but don't propagate — logging failure shouldn't kill the main request
      this.logger.error(`Failed to write integration log: ${err.message}`);
    }
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
    // FIX (Bug #14): Validate required fields — previously no validation at all
    if (!dto.orderId || !dto.amount || dto.amount <= 0) {
      throw new BadRequestException('orderId and a positive amount are required');
    }
    if (!dto.customerName || !dto.customerEmail) {
      throw new BadRequestException('customerName and customerEmail are required');
    }
    if (!['MIDTRANS', 'XENDIT'].includes(dto.provider)) {
      throw new BadRequestException('provider must be MIDTRANS or XENDIT');
    }

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
        gross_amount: String(dto.amount), // FIX: use actual amount, not hardcoded '0'
        va_numbers: [{ bank: 'bca', va_number: '12345678901234' }],
        _mock: true, // FIX: mark mock responses explicitly so callers can detect
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
    // FIX (Bug #14): Validate inputs
    if (!provider || !transactionId) {
      throw new BadRequestException('provider and transactionId are required');
    }

    // FIX (Bug #14): gross_amount was hardcoded '0' — callers could not trust the value.
    // Now we look up the actual amount from integration logs if available.
    const lastLog = await this.prisma.integrationLog.findFirst({
      where: { referenceId: transactionId, integrationType: 'PAYMENT_GATEWAY' },
      orderBy: { createdAt: 'desc' },
    });

    const grossAmount = lastLog?.requestPayload
      ? (typeof lastLog.requestPayload === 'object'
          ? (lastLog.requestPayload as any).gross_amount ?? '0'
          : '0')
      : '0';

    const mockStatus = {
      transaction_id: transactionId,
      transaction_status: 'settlement',
      settlement_time: new Date().toISOString(),
      gross_amount: String(grossAmount), // FIX: use actual amount from log
      _mock: true,
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
    if (!['TOKOPEDIA', 'SHOPEE'].includes(provider)) {
      throw new BadRequestException('provider must be TOKOPEDIA or SHOPEE');
    }
    if (!params.fromDate || !params.toDate) {
      throw new BadRequestException('fromDate and toDate are required');
    }
    if (params.fromDate > params.toDate) {
      throw new BadRequestException('fromDate must be before toDate');
    }

    const endpoint = `/api/orders`;
    try {
      const mockOrders = [
        {
          order_id: `MKT-${Date.now()}`,
          provider,
          status: 'NEW',
          total: 500000,
          items: [],
          buyer: { name: 'Customer Marketplace', email: 'buyer@example.com' },
          _mock: true,
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

  // ── Shipping / Ekspedisi ─────────────────────────────────
  async checkShippingRate(dto: {
    provider: 'JNE' | 'SICEPAT' | 'JNT' | 'ANTERAJA';
    origin: string;
    destination: string;
    weight: number;
    service?: string;
  }) {
    if (!dto.origin || !dto.destination) {
      throw new BadRequestException('origin and destination are required');
    }
    if (!dto.weight || dto.weight <= 0) {
      throw new BadRequestException('weight must be a positive number (grams)');
    }

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

    return { provider: dto.provider, rates: mockRates, _mock: true };
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
    if (!dto.orderId || !dto.service || !dto.receiverName || !dto.receiverAddress) {
      throw new BadRequestException('orderId, service, receiverName, and receiverAddress are required');
    }

    const mockAWB = `AWB${dto.provider}${Date.now()}`;
    const mockResult = {
      awb_number: mockAWB,
      order_id: dto.orderId,
      status: 'CREATED',
      estimated_delivery: '2-3 hari',
      _mock: true,
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
    if (!provider || !awbNumber) {
      throw new BadRequestException('provider and awbNumber are required');
    }

    const mockTracking = {
      awb_number: awbNumber,
      status: 'IN_TRANSIT',
      history: [
        { date: new Date().toISOString(), location: 'Jakarta Timur', description: 'Paket diterima kurir' },
        { date: new Date().toISOString(), location: 'Hub Jakarta', description: 'Paket tiba di hub' },
      ],
      _mock: true,
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
    // FIX (Bug #15): Replace in-memory aggregation over 1000 records
    // with a proper database-level groupBy. This is accurate regardless
    // of log volume and much more efficient.
    const grouped = await this.prisma.integrationLog.groupBy({
      by: ['integrationType', 'status'],
      _count: { id: true },
    });

    const byType: Record<string, { total: number; success: number; failed: number }> = {};

    for (const row of grouped) {
      const type = row.integrationType;
      if (!byType[type]) byType[type] = { total: 0, success: 0, failed: 0 };
      byType[type].total += row._count.id;
      if (row.status === 'SUCCESS') byType[type].success += row._count.id;
      else byType[type].failed += row._count.id;
    }

    const total = Object.values(byType).reduce((sum, t) => sum + t.total, 0);
    return { total, byType };
  }
}
