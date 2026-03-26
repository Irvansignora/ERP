import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Purchase Request ─────────────────────────────────────
  async createPurchaseRequest(dto: {
    requestDate: Date;
    neededDate?: Date;
    notes?: string;
    lines: Array<{
      productId?: string;
      description: string;
      quantity: number;
      estimatedPrice?: number;
    }>;
    userId?: string;
  }) {
    // FIX (Bug #4): Per-year sequential numbering scoped to current year
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseRequest.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const requestNumber = `PR-${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber,
        requestDate: dto.requestDate,
        neededDate: dto.neededDate,
        notes: dto.notes,
        createdBy: dto.userId,
        lines: {
          create: dto.lines.map((l, i) => ({
            lineNumber: i + 1,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            estimatedPrice: l.estimatedPrice,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async getAllPurchaseRequests(params: { status?: string; limit?: number }) {
    return this.prisma.purchaseRequest.findMany({
      where: params.status ? { status: params.status } : {},
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async approvePurchaseRequest(id: string) {
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  // ── Purchase Order ───────────────────────────────────────
  async createPurchaseOrder(dto: {
    supplierId: string;
    orderDate: Date;
    expectedDate?: Date;
    purchaseRequestId?: string;
    notes?: string;
    vatRate?: number; // FIX (Bug #8): configurable vatRate
    lines: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    userId?: string;
  }) {
    // FIX (Bug #4): Per-year sequential numbering
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const orderNumber = `PO-${year}-${String(count + 1).padStart(5, '0')}`;

    // FIX (Bug #8): Use configurable vatRate instead of hardcoded 0.12
    const effectiveVatRate = (dto.vatRate ?? 12) / 100;

    const lines = dto.lines.map((l, i) => {
      const totalPrice = l.quantity * l.unitPrice - (l.discount ?? 0);
      return {
        lineNumber: i + 1,
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount ?? 0,
        totalPrice,
        vatAmount: totalPrice * effectiveVatRate,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
    const taxAmount = subtotal * effectiveVatRate;

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        orderDate: dto.orderDate,
        expectedDate: dto.expectedDate,
        supplierId: dto.supplierId,
        purchaseRequestId: dto.purchaseRequestId,
        notes: dto.notes,
        subtotal,
        taxAmount,
        grandTotal: subtotal + taxAmount,
        createdBy: dto.userId,
        lines: { create: lines },
      },
      include: { lines: true, supplier: true },
    });
  }

  async getAllPurchaseOrders(params: { status?: string; supplierId?: string; limit?: number; page?: number }) {
    const skip = ((params.page ?? 1) - 1) * (params.limit ?? 20);
    const where: any = {
      ...(params.status && { status: params.status }),
      ...(params.supplierId && { supplierId: params.supplierId }),
    };
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { lines: true, supplier: true },
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 20,
        skip,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total };
  }

  async getPurchaseOrderById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true, supplier: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  async confirmPurchaseOrder(id: string) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT },
    });
  }

  async getPurchaseSummary() {
    const orders = await this.prisma.purchaseOrder.findMany();
    return {
      totalOrders: orders.length,
      totalSpend: orders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
      byStatus: {
        draft: orders.filter((o) => o.status === 'DRAFT').length,
        sent: orders.filter((o) => o.status === 'SENT').length,,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
      },
    };
  }
}
