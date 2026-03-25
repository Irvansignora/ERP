import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

export interface CreateProductDto {
  code: string;
  name: string;
  description?: string;
  type: string;
  taxObjectCode: string;
  taxObjectName?: string;
  isVatTaxable?: boolean;
  vatRate?: number;
  pphType?: string;
  pphRate?: number;
  uomCode: string;
  uomName: string;
  defaultPrice?: number;
  supplierId?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    this.logger.log(`Creating product: ${dto.code}`);
    return this.prisma.product.create({ data: dto as any });
  }

  async findAll(params?: { type?: string; search?: string; skip?: number; take?: number }) {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: params?.skip ?? 0,
        take: params?.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, skip: params?.skip ?? 0, take: params?.take ?? 20 };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findByCode(code: string) {
    const product = await this.prisma.product.findUnique({ where: { code } });
    if (!product) throw new NotFoundException(`Product with code ${code} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
