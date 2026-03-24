import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { TaxValidatorService, ValidationSummary } from '@infrastructure/validators/tax-validator.service';
import { Partner, PartnerType, TaxStatus, PtkpStatus, TerCategory } from '@domain/entities/partner.entity';
import { Decimal } from 'decimal.js';

export interface CreatePartnerDto {
  code: string;
  name: string;
  type: PartnerType;
  npwp16?: string;
  nitku?: string;
  nik?: string;
  passport?: string;
  taxStatus: TaxStatus;
  isPkp: boolean;
  pkpDate?: Date;
  address?: string;
  countryCode?: string;
  province?: string;
  city?: string;
  district?: string;
  subDistrict?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  fax?: string;
  businessType?: string;
  businessField?: string;
  ptkpStatus?: PtkpStatus;
  terCategory?: TerCategory;
  isEmployee?: boolean;
  joinDate?: Date;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {}

export interface PartnerFilter {
  type?: PartnerType;
  taxStatus?: TaxStatus;
  isPkp?: boolean;
  isEmployee?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: TaxValidatorService,
  ) {}

  async create(dto: CreatePartnerDto, userId: string): Promise<Partner> {
    this.logger.log(`Creating partner: ${dto.code}`);

    // Check if code already exists
    const existing = await this.prisma.partner.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Partner with code ${dto.code} already exists`);
    }

    // Validate NPWP 16 if provided
    if (dto.npwp16) {
      const validation = this.validator.validateNpwp16(dto.npwp16);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Validate NIK if provided
    if (dto.nik) {
      const validation = this.validator.validateNik(dto.nik);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Validate NITKU if provided
    if (dto.nitku) {
      const validation = this.validator.validateNitku(dto.nitku);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Auto-generate NITKU if NPWP is provided but NITKU is not
    let nitku = dto.nitku;
    if (dto.npwp16 && !nitku) {
      nitku = `${dto.npwp16}000000`;
    }

    const partner = await this.prisma.partner.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        npwp16: dto.npwp16,
        nitku,
        nik: dto.nik,
        passport: dto.passport,
        taxStatus: dto.taxStatus,
        isPkp: dto.isPkp,
        pkpDate: dto.pkpDate,
        address: dto.address,
        countryCode: dto.countryCode || 'IDN',
        province: dto.province,
        city: dto.city,
        district: dto.district,
        subDistrict: dto.subDistrict,
        postalCode: dto.postalCode,
        email: dto.email,
        phone: dto.phone,
        fax: dto.fax,
        businessType: dto.businessType,
        businessField: dto.businessField,
        ptkpStatus: dto.ptkpStatus,
        terCategory: dto.terCategory,
        isEmployee: dto.isEmployee || false,
        joinDate: dto.joinDate,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankBranch: dto.bankBranch,
        createdBy: userId,
      },
    });

    this.logger.log(`Partner created: ${partner.id}`);
    return this.mapToEntity(partner);
  }

  async findAll(filter: PartnerFilter): Promise<{ data: Partner[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.taxStatus) {
      where.taxStatus = filter.taxStatus;
    }

    if (filter.isPkp !== undefined) {
      where.isPkp = filter.isPkp;
    }

    if (filter.isEmployee !== undefined) {
      where.isEmployee = filter.isEmployee;
    }

    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
        { npwp16: { contains: filter.search } },
        { nik: { contains: filter.search } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data: partners.map(p => this.mapToEntity(p)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Partner> {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!partner || partner.isDeleted) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    return this.mapToEntity(partner);
  }

  async findByCode(code: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { code },
    });

    if (!partner || partner.isDeleted) {
      return null;
    }

    return this.mapToEntity(partner);
  }

  async update(id: string, dto: UpdatePartnerDto, userId: string): Promise<Partner> {
    this.logger.log(`Updating partner: ${id}`);

    const existing = await this.findById(id);

    // Validate NPWP 16 if being updated
    if (dto.npwp16 && dto.npwp16 !== existing.npwp16) {
      const validation = this.validator.validateNpwp16(dto.npwp16);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Validate NIK if being updated
    if (dto.nik && dto.nik !== existing.nik) {
      const validation = this.validator.validateNik(dto.nik);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Validate NITKU if being updated
    if (dto.nitku && dto.nitku !== existing.nitku) {
      const validation = this.validator.validateNitku(dto.nitku);
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Partner updated: ${partner.id}`);
    return this.mapToEntity(partner);
  }

  async delete(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting partner: ${id}`);

    await this.findById(id);

    await this.prisma.partner.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    this.logger.log(`Partner deleted: ${id}`);
  }

  async validateForXmlExport(id: string): Promise<ValidationSummary> {
    const partner = await this.findById(id);
    return this.validator.validatePartner(partner);
  }

  async getEmployeesByTerCategory(category: TerCategory): Promise<Partner[]> {
    const partners = await this.prisma.partner.findMany({
      where: {
        isEmployee: true,
        terCategory: category,
        isDeleted: false,
      },
    });

    return partners.map(p => this.mapToEntity(p));
  }

  async getPkpPartners(): Promise<Partner[]> {
    const partners = await this.prisma.partner.findMany({
      where: {
        isPkp: true,
        isDeleted: false,
      },
    });

    return partners.map(p => this.mapToEntity(p));
  }

  private mapToEntity(data: any): Partner {
    return new Partner({
      id: data.id,
      code: data.code,
      name: data.name,
      type: data.type as PartnerType,
      status: data.status,
      npwp15: data.npwp15,
      npwp16: data.npwp16,
      nitku: data.nitku,
      nik: data.nik,
      passport: data.passport,
      taxStatus: data.taxStatus as TaxStatus,
      isPkp: data.isPkp,
      pkpDate: data.pkpDate,
      address: data.address,
      countryCode: data.countryCode,
      province: data.province,
      city: data.city,
      district: data.district,
      subDistrict: data.subDistrict,
      postalCode: data.postalCode,
      email: data.email,
      phone: data.phone,
      fax: data.fax,
      businessType: data.businessType,
      businessField: data.businessField,
      ptkpStatus: data.ptkpStatus as PtkpStatus,
      terCategory: data.terCategory as TerCategory,
      isEmployee: data.isEmployee,
      joinDate: data.joinDate,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      bankBranch: data.bankBranch,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      isDeleted: data.isDeleted,
    });
  }
}
