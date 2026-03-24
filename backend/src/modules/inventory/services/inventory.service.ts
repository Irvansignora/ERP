import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Warehouses ──────────────────────────────────────────
  async getAllWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  }

  async createWarehouse(data: {
    code: string; name: string; address?: string; isDefault?: boolean;
  }) {
    return this.prisma.warehouse.create({ data });
  }

  // ── Stock ────────────────────────────────────────────────
  async getStockByWarehouse(warehouseId: string) {
    return this.prisma.stock.findMany({
      where: { warehouseId },
      include: { product: true, warehouse: true },
    });
  }

  async getLowStockAlerts() {
    const stocks = await this.prisma.stock.findMany({
      include: { product: true, warehouse: true },
    });
    return stocks.filter((s) => Number(s.quantity) <= Number(s.minimumQty));
  }

  async getStockSummary(productId: string) {
    const stocks = await this.prisma.stock.findMany({
      where: { productId },
      include: { warehouse: true },
    });
    const total = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
    return { productId, totalStock: total, byWarehouse: stocks };
  }

  // ── Stock Movements ──────────────────────────────────────
  async createMovement(dto: {
    movementType: StockMovementType;
    movementDate: Date;
    productId: string;
    quantity: number;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    unitCost?: number;
    batchNumber?: string;
    serialNumber?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    userId?: string;
  }) {
    if (dto.movementType === StockMovementType.IN && !dto.toWarehouseId) {
      throw new BadRequestException('toWarehouseId required for IN movement');
    }
    if (dto.movementType === StockMovementType.OUT && !dto.fromWarehouseId) {
      throw new BadRequestException('fromWarehouseId required for OUT movement');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          movementType: dto.movementType,
          movementDate: dto.movementDate,
          productId: dto.productId,
          quantity: dto.quantity,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          unitCost: dto.unitCost,
          batchNumber: dto.batchNumber,
          serialNumber: dto.serialNumber,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          notes: dto.notes,
          createdBy: dto.userId,
        },
      });

      // Update destination stock (IN or TRANSFER)
      if (dto.toWarehouseId) {
        await tx.stock.upsert({
          where: {
            warehouseId_productId_batchNumber: {
              warehouseId: dto.toWarehouseId,
              productId: dto.productId,
              batchNumber: dto.batchNumber ?? '',
            },
          },
          update: { quantity: { increment: dto.quantity } },
          create: {
            warehouseId: dto.toWarehouseId,
            productId: dto.productId,
            quantity: dto.quantity,
            batchNumber: dto.batchNumber,
            serialNumber: dto.serialNumber,
          },
        });
      }

      // Update source stock (OUT or TRANSFER)
      if (dto.fromWarehouseId) {
        // FIX (Bug #11): Use the SAME composite unique key (warehouseId + productId + batchNumber)
        // that the upsert above uses for IN movements, instead of findFirst() which returns
        // an arbitrary record when multiple stock entries exist for the same product/warehouse.
        // Using findFirst() + update-by-id could decrement the WRONG batch's stock.
        const batchNumber = dto.batchNumber ?? '';

        const existingStock = await tx.stock.findUnique({
          where: {
            warehouseId_productId_batchNumber: {
              warehouseId: dto.fromWarehouseId,
              productId: dto.productId,
              batchNumber,
            },
          },
        });

        if (!existingStock) {
          throw new BadRequestException(
            `No stock found for product in warehouse` +
            (dto.batchNumber ? ` (batch: ${dto.batchNumber})` : ''),
          );
        }

        if (Number(existingStock.quantity) < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock: available ${existingStock.quantity}, requested ${dto.quantity}` +
            (dto.batchNumber ? ` (batch: ${dto.batchNumber})` : ''),
          );
        }

        // Update using the unique composite key — no chance of hitting the wrong record
        await tx.stock.update({
          where: {
            warehouseId_productId_batchNumber: {
              warehouseId: dto.fromWarehouseId,
              productId: dto.productId,
              batchNumber,
            },
          },
          data: { quantity: { decrement: dto.quantity } },
        });
      }

      return movement;
    });
  }

  async getMovements(params: { productId?: string; warehouseId?: string; limit?: number }) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(params.productId && { productId: params.productId }),
        ...(params.warehouseId && {
          OR: [
            { fromWarehouseId: params.warehouseId },
            { toWarehouseId: params.warehouseId },
          ],
        }),
      },
      include: { product: true, fromWarehouse: true, toWarehouse: true },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }
}
