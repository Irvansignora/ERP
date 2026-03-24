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
    const count = await this.prisma.purchaseRequest.count();
    const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

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
    lines: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    userId?: string;
  }) {
    const count = await this.prisma.purchaseOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

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
        vatAmount: totalPrice * 0.12,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
    const taxAmount = subtotal * 0.12;

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

  async getAllPurchaseOrders(params: {
    supplierId?: string;
    status?: PurchaseOrderStatus;
    limit?: number;
    page?: number;
  }) {
    const skip = ((params.page ?? 1) - 1) * (params.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: {
          ...(params.supplierId && { supplierId: params.supplierId }),
          ...(params.status && { status: params.status }),
        },
        include: { supplier: true, lines: true },
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 20,
        skip,
      }),
      this.prisma.purchaseOrder.count(),
    ]);
    return { data, total };
  }

  async getPurchaseOrderById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, lines: { include: { product: true } }, purchaseRequest: true },
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
        sent: orders.filter((o) => o.status === 'SENT').length,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
      },
    };
  }
}
