import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { SalesOrderStatus } from '@prisma/client';

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Quotations ───────────────────────────────────────────
  async createQuotation(dto: {
    customerId: string;
    quotationDate: Date;
    expiryDate?: Date;
    notes?: string;
    terms?: string;
    lines: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    userId?: string;
  }) {
    const count = await this.prisma.quotation.count();
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const lines = dto.lines.map((l, i) => ({
      lineNumber: i + 1,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount ?? 0,
      totalPrice: l.quantity * l.unitPrice - (l.discount ?? 0),
    }));

    const subtotal = lines.reduce((sum, l) => sum + Number(l.totalPrice), 0);
    const taxAmount = subtotal * 0.12;

    return this.prisma.quotation.create({
      data: {
        quotationNumber,
        quotationDate: dto.quotationDate,
        expiryDate: dto.expiryDate,
        customerId: dto.customerId,
        notes: dto.notes,
        terms: dto.terms,
        discount: 0,
        subtotal,
        taxAmount,
        grandTotal: subtotal + taxAmount,
        createdBy: dto.userId,
        lines: { create: lines },
      },
      include: { lines: true, customer: true },
    });
  }

  async getAllQuotations(params: { customerId?: string; status?: string; limit?: number }) {
    return this.prisma.quotation.findMany({
      where: {
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.status && { status: params.status }),
      },
      include: { customer: true, lines: true },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async convertToSalesOrder(quotationId: string, userId?: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lines: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const count = await this.prisma.salesOrder.count();
    const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const so = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: new Date(),
        customerId: quotation.customerId,
        quotationId: quotation.id,
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        grandTotal: quotation.grandTotal,
        createdBy: userId,
        lines: {
          create: quotation.lines.map((l) => ({
            lineNumber: l.lineNumber,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            totalPrice: l.totalPrice,
            vatAmount: Number(l.totalPrice) * 0.12,
          })),
        },
      },
      include: { lines: true, customer: true },
    });

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' },
    });

    return so;
  }

  // ── Sales Orders ─────────────────────────────────────────
  async getAllSalesOrders(params: {
    customerId?: string;
    status?: SalesOrderStatus;
    limit?: number;
    page?: number;
  }) {
    const skip = ((params.page ?? 1) - 1) * (params.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: {
          ...(params.customerId && { customerId: params.customerId }),
          ...(params.status && { status: params.status }),
        },
        include: { customer: true, lines: true },
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 20,
        skip,
      }),
      this.prisma.salesOrder.count(),
    ]);
    return { data, total };
  }

  async getSalesOrderById(id: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true, lines: { include: { product: true } }, quotation: true },
    });
    if (!so) throw new NotFoundException('Sales Order not found');
    return so;
  }

  async confirmSalesOrder(id: string) {
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
    });
  }

  async getSalesSummary(period?: string) {
    const where = period
      ? {
          orderDate: {
            gte: new Date(`${period}-01`),
            lt: new Date(
              new Date(`${period}-01`).setMonth(new Date(`${period}-01`).getMonth() + 1),
            ),
          },
        }
      : {};

    const orders = await this.prisma.salesOrder.findMany({ where });
    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
      byStatus: {
        draft: orders.filter((o) => o.status === 'DRAFT').length,
        confirmed: orders.filter((o) => o.status === 'CONFIRMED').length,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
      },
    };
  }
}
