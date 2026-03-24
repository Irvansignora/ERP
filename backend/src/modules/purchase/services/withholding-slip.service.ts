import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { XmlGeneratorService, XmlGenerationResult } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService, ValidationSummary } from '@infrastructure/validators/tax-validator.service';
import { WithholdingSlip, WithholdingType, WithholdingStatus, TerCategory } from '@domain/entities/withholding-slip.entity';
import { Decimal } from 'decimal.js';

export interface CreateWithholdingSlipDto {
  slipNumber: string;
  slipType: WithholdingType;
  taxYear: number;
  taxMonth: number;
  subjectId: string;
  taxObjectCode: string;
  taxObjectName: string;
  incomeAmount: number;
  taxRate?: number;
  terCategory?: TerCategory;
  documentNumber?: string;
  documentDate?: Date;
  supportingDocType?: string;
  supportingDocNumber?: string;
}

export interface WithholdingSlipFilter {
  slipType?: WithholdingType;
  taxPeriod?: string;
  subjectId?: string;
  status?: WithholdingStatus;
  xmlGenerated?: boolean;
  page?: number;
  limit?: number;
}

// FIX (Bug #10): Extended result type that includes skipped/errored IDs
export interface XmlGenerationResultWithErrors extends XmlGenerationResult {
  skipped?: Array<{ id: string; reason: string }>;
  processedCount?: number;
}

@Injectable()
export class WithholdingSlipService {
  private readonly logger = new Logger(WithholdingSlipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly validator: TaxValidatorService,
  ) {}

  async create(dto: CreateWithholdingSlipDto, userId: string): Promise<WithholdingSlip> {
    this.logger.log(`Creating withholding slip: ${dto.slipNumber}`);

    const existing = await this.prisma.withholdingSlip.findUnique({
      where: { slipNumber: dto.slipNumber },
    });
    if (existing) {
      throw new BadRequestException(`Withholding slip with number ${dto.slipNumber} already exists`);
    }

    const subject = await this.prisma.partner.findUnique({ where: { id: dto.subjectId } });
    if (!subject || subject.isDeleted) {
      throw new BadRequestException('Subject not found');
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      throw new BadRequestException('Company configuration not found');
    }

    const incomeAmount = new Decimal(dto.incomeAmount);
    let taxBase: Decimal;
    let taxRate: Decimal;
    let taxAmount: Decimal;
    let terRate: Decimal | undefined;

    if (dto.slipType === WithholdingType.PPH_21) {
      if (!dto.terCategory && !subject.terCategory) {
        throw new BadRequestException('TER category is required for PPh 21');
      }
      const terCategory = dto.terCategory || subject.terCategory as TerCategory;
      const calculated = WithholdingSlip.calculatePph21Ter(incomeAmount, terCategory);
      taxBase = calculated.taxBase;
      taxRate = calculated.taxRate;
      taxAmount = calculated.taxAmount;
      terRate = calculated.taxRate;
    } else if (dto.slipType === WithholdingType.PPH_23) {
      const calculated = WithholdingSlip.calculatePph23(incomeAmount);
      taxBase = calculated.taxBase;
      taxRate = calculated.taxRate;
      taxAmount = calculated.taxAmount;
    } else if (dto.slipType === WithholdingType.PPH_4_AYAT_2) {
      const rate = new Decimal(dto.taxRate || 10);
      const calculated = WithholdingSlip.calculatePph4Ayat2(incomeAmount, rate);
      taxBase = calculated.taxBase;
      taxRate = calculated.taxRate;
      taxAmount = calculated.taxAmount;
    } else {
      taxBase = incomeAmount;
      taxRate = new Decimal(dto.taxRate || 0);
      taxAmount = taxBase.times(taxRate.dividedBy(100));
    }

    const taxPeriod = `${dto.taxMonth.toString().padStart(2, '0')}-${dto.taxYear}`;

    const slip = await this.prisma.withholdingSlip.create({
      data: {
        slipNumber: dto.slipNumber,
        slipType: dto.slipType,
        taxPeriod,
        taxYear: dto.taxYear,
        taxMonth: dto.taxMonth,
        withholderTin: companyConfig.companyTin,
        withholderNitku: companyConfig.companyNitku,
        withholderName: companyConfig.companyName,
        subjectId: subject.id,
        subjectTin: subject.npwp16,
        subjectNik: subject.nik,
        subjectName: subject.name,
        subjectAddress: subject.address,
        subjectNitku: subject.nitku,
        taxObjectCode: dto.taxObjectCode,
        taxObjectName: dto.taxObjectName,
        incomeAmount,
        taxBase,
        taxRate,
        taxAmount,
        terCategory: dto.terCategory || subject.terCategory as TerCategory,
        terRate,
        documentNumber: dto.documentNumber,
        documentDate: dto.documentDate,
        supportingDocType: dto.supportingDocType,
        supportingDocNumber: dto.supportingDocNumber,
        xmlGenerated: false,
        status: WithholdingStatus.DRAFT,
        createdBy: userId,
      },
    });

    this.logger.log(`Withholding slip created: ${slip.id}`);
    return this.mapToEntity(slip);
  }

  async findAll(filter: WithholdingSlipFilter): Promise<{ data: WithholdingSlip[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.slipType) where.slipType = filter.slipType;
    if (filter.taxPeriod) where.taxPeriod = filter.taxPeriod;
    if (filter.subjectId) where.subjectId = filter.subjectId;
    if (filter.status) where.status = filter.status;
    if (filter.xmlGenerated !== undefined) where.xmlGenerated = filter.xmlGenerated;

    const [slips, total] = await Promise.all([
      this.prisma.withholdingSlip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { subject: true },
      }),
      this.prisma.withholdingSlip.count({ where }),
    ]);

    return { data: slips.map(s => this.mapToEntity(s)), total, page, limit };
  }

  async findById(id: string): Promise<WithholdingSlip> {
    const slip = await this.prisma.withholdingSlip.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!slip) {
      throw new NotFoundException(`Withholding slip with ID ${id} not found`);
    }
    return this.mapToEntity(slip);
  }

  async issue(id: string, userId: string): Promise<WithholdingSlip> {
    const slip = await this.findById(id);
    if (slip.status !== WithholdingStatus.DRAFT) {
      throw new BadRequestException('Only draft slips can be issued');
    }
    const updated = await this.prisma.withholdingSlip.update({
      where: { id },
      data: { status: WithholdingStatus.ISSUED, updatedBy: userId, updatedAt: new Date() },
      include: { subject: true },
    });
    return this.mapToEntity(updated);
  }

  async cancel(id: string, userId: string): Promise<WithholdingSlip> {
    const slip = await this.findById(id);
    if (slip.status !== WithholdingStatus.ISSUED) {
      throw new BadRequestException('Only issued slips can be cancelled');
    }
    const updated = await this.prisma.withholdingSlip.update({
      where: { id },
      data: { status: WithholdingStatus.CANCELLED, updatedBy: userId, updatedAt: new Date() },
      include: { subject: true },
    });
    return this.mapToEntity(updated);
  }

  async generatePph21Xml(ids: string[], userId: string): Promise<XmlGenerationResultWithErrors> {
    this.logger.log(`Generating PPh 21 XML for ${ids.length} slips`);

    const slips: WithholdingSlip[] = [];
    // FIX (Bug #10): Collect skipped items and return them to the caller
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        const slip = await this.findById(id);
        if (slip.slipType !== WithholdingType.PPH_21) {
          skipped.push({ id, reason: `Slip type is ${slip.slipType}, expected PPH_21` });
          continue;
        }
        const validation = this.validator.validateWithholdingSlip(slip);
        if (validation.isValid) {
          slips.push(slip);
        } else {
          skipped.push({ id, reason: validation.errors.map(e => e.message).join(', ') });
        }
      } catch (error) {
        skipped.push({ id, reason: error.message });
      }
    }

    if (slips.length === 0) {
      return {
        success: false,
        error: 'No valid PPh 21 slips found',
        skipped,
        processedCount: 0,
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return { success: false, error: 'Company configuration not found', skipped };
    }

    const result = this.xmlGenerator.generatePph21Xml(slips, companyConfig.companyTin);

    if (result.success) {
      // FIX (Bug #5): Wrap all DB updates in a single transaction
      await this.prisma.$transaction(
        slips.map((slip) =>
          this.prisma.withholdingSlip.update({
            where: { id: slip.id },
            data: {
              xmlGenerated: true,
              xmlGeneratedAt: new Date(),
              xmlFileName: result.fileName,
              xmlContent: result.content,
              updatedBy: userId,
            },
          }),
        ),
      );
    }

    return { ...result, skipped, processedCount: slips.length };
  }

  async generatePphUnifikasiXml(ids: string[], userId: string): Promise<XmlGenerationResultWithErrors> {
    this.logger.log(`Generating PPh Unifikasi XML for ${ids.length} slips`);

    const slips: WithholdingSlip[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        const slip = await this.findById(id);
        if (slip.slipType === WithholdingType.PPH_21) {
          skipped.push({ id, reason: 'PPH_21 slips must use generatePph21Xml instead' });
          continue;
        }
        const validation = this.validator.validateWithholdingSlip(slip);
        if (validation.isValid) {
          slips.push(slip);
        } else {
          skipped.push({ id, reason: validation.errors.map(e => e.message).join(', ') });
        }
      } catch (error) {
        skipped.push({ id, reason: error.message });
      }
    }

    if (slips.length === 0) {
      return {
        success: false,
        error: 'No valid slips found for Unifikasi',
        skipped,
        processedCount: 0,
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return { success: false, error: 'Company configuration not found', skipped };
    }

    const result = this.xmlGenerator.generatePphUnifikasiXml(
      slips,
      companyConfig.companyTin,
      companyConfig.companyNitku,
    );

    if (result.success) {
      // FIX (Bug #5): Wrap all DB updates in a single transaction
      await this.prisma.$transaction(
        slips.map((slip) =>
          this.prisma.withholdingSlip.update({
            where: { id: slip.id },
            data: {
              xmlGenerated: true,
              xmlGeneratedAt: new Date(),
              xmlFileName: result.fileName,
              xmlContent: result.content,
              updatedBy: userId,
            },
          }),
        ),
      );
    }

    return { ...result, skipped, processedCount: slips.length };
  }

  async validateForExport(id: string): Promise<ValidationSummary> {
    const slip = await this.findById(id);
    return this.validator.validateWithholdingSlip(slip);
  }

  private mapToEntity(data: any): WithholdingSlip {
    return new WithholdingSlip({
      id: data.id,
      slipNumber: data.slipNumber,
      slipType: data.slipType as WithholdingType,
      status: data.status as WithholdingStatus,
      taxPeriod: data.taxPeriod,
      taxYear: data.taxYear,
      taxMonth: data.taxMonth,
      withholderTin: data.withholderTin,
      withholderNitku: data.withholderNitku,
      withholderName: data.withholderName,
      subjectId: data.subjectId,
      subjectTin: data.subjectTin,
      subjectNik: data.subjectNik,
      subjectName: data.subjectName,
      subjectAddress: data.subjectAddress,
      subjectNitku: data.subjectNitku,
      taxObjectCode: data.taxObjectCode,
      taxObjectName: data.taxObjectName,
      incomeAmount: new Decimal(data.incomeAmount),
      taxBase: new Decimal(data.taxBase),
      taxRate: new Decimal(data.taxRate),
      taxAmount: new Decimal(data.taxAmount),
      terCategory: data.terCategory as TerCategory,
      terRate: data.terRate ? new Decimal(data.terRate) : undefined,
      documentNumber: data.documentNumber,
      documentDate: data.documentDate,
      supportingDocType: data.supportingDocType,
      supportingDocNumber: data.supportingDocNumber,
      xmlGenerated: data.xmlGenerated,
      xmlGeneratedAt: data.xmlGeneratedAt,
      xmlFileName: data.xmlFileName,
      xmlContent: data.xmlContent,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    });
  }
}
