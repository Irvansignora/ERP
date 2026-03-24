import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PriceListType } from '@prisma/client';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async createPriceList(dto: {
    name: string;
    type: PriceListType;
    currency?: string;
    startDate?: Date;
    endDate?: Date;
    minQty?: number;
    items: Array<{ productId: string; price: number; discountPct?: number }>;
  }) {
    return this.prisma.priceList.create({
      data: {
        name: dto.name,
        type: dto.type,
        currency: dto.currency ?? 'IDR',
        startDate: dto.startDate,
        endDate: dto.endDate,
        minQty: dto.minQty ?? 1,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            price: i.price,
            discountPct: i.discountPct ?? 0,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  }

  async getAllPriceLists(params?: { type?: PriceListType; isActive?: boolean }) {
    return this.prisma.priceList.findMany({
      where: {
        ...(params?.type && { type: params.type }),
        ...(params?.isActive !== undefined && { isActive: params.isActive }),
      },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPriceForProduct(productId: string, type: PriceListType = PriceListType.RETAIL, qty: number = 1) {
    const now = new Date();
    const priceList = await this.prisma.priceList.findFirst({
      where: {
        type,
        isActive: true,
        minQty: { lte: qty },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        items: { some: { productId } },
      },
      include: { items: { where: { productId } } },
      orderBy: { minQty: 'desc' },
    });

    if (!priceList || priceList.items.length === 0) {
      // Fallback to default product price
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      return { price: product?.defaultPrice ?? 0, discountPct: 0, source: 'default' };
    }

    const item = priceList.items[0];
    return {
      price: Number(item.price),
      discountPct: Number(item.discountPct),
      effectivePrice: Number(item.price) * (1 - Number(item.discountPct) / 100),
      priceListName: priceList.name,
      source: 'price_list',
    };
  }

  async deactivatePriceList(id: string) {
    return this.prisma.priceList.update({ where: { id }, data: { isActive: false } });
  }
}
