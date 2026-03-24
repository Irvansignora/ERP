import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { WorkOrderStatus } from '@prisma/client';

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Bill of Materials ────────────────────────────────────
  async createBom(dto: {
    productId: string;
    quantity: number;
    uom: string;
    components: Array<{ productId: string; quantity: number; uom: string; notes?: string }>;
  }) {
    return this.prisma.billOfMaterials.create({
      data: {
        productId: dto.productId,
        quantity: dto.quantity,
        uom: dto.uom,
        components: {
          create: dto.components.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            uom: c.uom,
            notes: c.notes,
          })),
        },
      },
      include: { components: { include: { product: true } }, product: true },
    });
  }

  async getAllBoms() {
    return this.prisma.billOfMaterials.findMany({
      include: { product: true, components: { include: { product: true } } },
    });
  }

  async getBomById(id: string) {
    const bom = await this.prisma.billOfMaterials.findUnique({
      where: { id },
      include: { product: true, components: { include: { product: true } } },
    });
    if (!bom) throw new NotFoundException('BOM not found');
    return bom;
  }

  // ── Work Orders ──────────────────────────────────────────
  async createWorkOrder(dto: {
    bomId: string;
    plannedQty: number;
    plannedStart?: Date;
    plannedEnd?: Date;
    notes?: string;
    userId?: string;
  }) {
    const count = await this.prisma.workOrder.count();
    const orderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Check component availability
    const bom = await this.prisma.billOfMaterials.findUnique({
      where: { id: dto.bomId },
      include: { components: { include: { product: true } } },
    });
    if (!bom) throw new NotFoundException('BOM not found');

    return this.prisma.workOrder.create({
      data: {
        orderNumber,
        bomId: dto.bomId,
        plannedQty: dto.plannedQty,
        plannedStart: dto.plannedStart,
        plannedEnd: dto.plannedEnd,
        notes: dto.notes,
        createdBy: dto.userId,
      },
      include: { bom: { include: { product: true, components: { include: { product: true } } } } },
    });
  }

  async getAllWorkOrders(params: { status?: WorkOrderStatus; limit?: number }) {
    return this.prisma.workOrder.findMany({
      where: params.status ? { status: params.status } : {},
      include: { bom: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async updateWorkOrderStatus(id: string, status: WorkOrderStatus, producedQty?: number) {
    const data: any = { status };
    if (status === WorkOrderStatus.IN_PROGRESS) data.actualStart = new Date();
    if (status === WorkOrderStatus.COMPLETED) {
      data.actualEnd = new Date();
      if (producedQty) data.producedQty = producedQty;
    }
    return this.prisma.workOrder.update({ where: { id }, data });
  }

  async getProductionSummary() {
    const workOrders = await this.prisma.workOrder.findMany();
    return {
      total: workOrders.length,
      inProgress: workOrders.filter((w) => w.status === 'IN_PROGRESS').length,
      completed: workOrders.filter((w) => w.status === 'COMPLETED').length,
      planned: workOrders.filter((w) => w.status === 'PLANNED').length,
    };
  }
}
