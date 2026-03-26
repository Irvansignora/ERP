import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { XmlGeneratorService, XmlGenerationResult } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService, ValidationSummary } from '@infrastructure/validators/tax-validator.service';
import { TaxInvoice, TaxInvoiceLine, InvoiceType, InvoiceOption, TransactionCode } from '@domain/entities/tax-invoice.entity';
import { Decimal } from 'decimal.js';

export interface CreateTaxInvoiceLineDto {
  lineNumber: number;
  productId?: string;
  productCode: string;
  productName: string;
  productType: 'B' | 'J';
  unitCode: string;
  unitName?: string;
  quantity: number;
  price: number;
  discount?: number;
  vatRate?: number;
  ppnbmRate?: number;
}

export interface CreateTaxInvoiceDto {
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType?: InvoiceType;
  invoiceOption?: InvoiceOption;
  referenceInvoiceId?: string;
  transactionCode: TransactionCode;
  additionalInfo?: string;
  customDoc?: string;
  customDocMonthYear?: string;
  referenceDesc?: string;
  facilityStamp?: string;
  sellerId: string;
  buyerId: string;
  isTaxInclusive?: boolean;
  vatRate?: number;
  lines: CreateTaxInvoiceLineDto[];
}

export interface TaxInvoiceFilter {
  taxPeriod?: string;
  buyerId?: string;
  sellerId?: string;
  xmlGenerated?: boolean;
  approvalStatus?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TaxInvoiceService {
  private readonly logger = new Logger(TaxInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly validator: TaxValidatorService,
  ) {}

  async create(dto: CreateTaxInvoiceDto, userId: string): Promise<TaxInvoice> {
    this.logger.log(`Creating tax invoice: ${dto.invoiceNumber}`);

    const existing = await this.prisma.taxInvoice.findUnique({
      where: { invoiceNumber: dto.invoiceNumber },
    });

    if (existing) {
      throw new BadRequestException(`Tax invoice with number ${dto.invoiceNumber} already exists`);
    }

    const seller = await this.prisma.partner.findUnique({ where: { id: dto.sellerId } });
    if (!seller || seller.isDeleted) {
      throw new BadRequestException('Seller not found');
    }

    const buyer = await this.prisma.partner.findUnique({ where: { id: dto.buyerId } });
    if (!buyer || buyer.isDeleted) {
      throw new BadRequestException('Buyer not found');
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const vatRate = new Decimal(dto.vatRate || 12);
    const isTaxInclusive = dto.isTaxInclusive || false;

    let totalDpp = new Decimal(0);
    let totalPpn = new Decimal(0);
    let totalPpnBm = new Decimal(0);
    let totalDiscount = new Decimal(0);

    const invoiceLines: any[] = [];

    for (const line of dto.lines) {
      const quantity = new Decimal(line.quantity);
      const price = new Decimal(line.price);
      const discount = new Decimal(line.discount || 0);
      const lineVatRate = new Decimal(line.vatRate || vatRate);
      const linePpnbmRate = new Decimal(line.ppnbmRate || 0);

      const calculated = TaxInvoice.calculateLine(quantity, price, discount, lineVatRate, isTaxInclusive);
      const ppnbmAmount = calculated.dpp.times(linePpnbmRate.dividedBy(100));

      invoiceLines.push({
        lineNumber: line.lineNumber,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        productType: line.productType,
        unitCode: line.unitCode,
        unitName: line.unitName,
        quantity,
        price,
        discount,
        totalPrice: calculated.totalPrice,
        dpp: calculated.dpp,
        otherTaxBase: calculated.dpp,
        vatRate: lineVatRate,
        vatAmount: calculated.vatAmount,
        ppnbmRate: linePpnbmRate,
        ppnbmAmount,
      });

      totalDpp = totalDpp.plus(calculated.dpp);
      totalPpn = totalPpn.plus(calculated.vatAmount);
      totalPpnBm = totalPpnBm.plus(ppnbmAmount);
      totalDiscount = totalDiscount.plus(discount);
    }

    const grandTotal = totalDpp.plus(totalPpn).plus(totalPpnBm);
    const invoiceDate = new Date(dto.invoiceDate);
    const taxMonth = invoiceDate.getMonth() + 1;
    const taxYear = invoiceDate.getFullYear();
    const taxPeriod = `${taxMonth.toString().padStart(2, '0')}-${taxYear}`;

    const invoice = await this.prisma.taxInvoice.create({
      data: {
        invoiceNumber: dto.invoiceNumber,
        invoiceDate,
        invoiceType: dto.invoiceType || InvoiceType.NORMAL,
        invoiceOption: dto.invoiceOption || InvoiceOption.NORMAL,
        referenceInvoiceId: dto.referenceInvoiceId,
        taxPeriod,
        taxYear,
        taxMonth,
        transactionCode: dto.transactionCode as any,
        additionalInfo: dto.additionalInfo,
        customDoc: dto.customDoc,
        customDocMonthYear: dto.customDocMonthYear,
        referenceDesc: dto.referenceDesc,
        facilityStamp: dto.facilityStamp,
        sellerId: seller.id,
        sellerTin: seller.npwp16 || '',
        sellerNitku: seller.nitku || '',
        buyerId: buyer.id,
        buyerTin: buyer.npwp16 || '',
        buyerDocument: 'TIN',
        buyerCountry: buyer.countryCode || 'IDN',
        buyerName: buyer.name,
        buyerAddress: buyer.address || '',
        buyerEmail: buyer.email,
        buyerNitku: buyer.nitku || '',
        isTaxInclusive,
        vatRate,
        totalDpp,
        totalPpn,
        totalPpnBm,
        totalDiscount,
        grandTotal,
        xmlGenerated: false,
        createdBy: userId,
        lines: { create: invoiceLines },
      },
      include: { lines: true },
    });

    this.logger.log(`Tax invoice created: ${invoice.id}`);
    return this.mapToEntity(invoice);
  }

  async findAll(filter: TaxInvoiceFilter): Promise<{ data: TaxInvoice[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.taxPeriod) where.taxPeriod = filter.taxPeriod;
    if (filter.buyerId) where.buyerId = filter.buyerId;
    if (filter.sellerId) where.sellerId = filter.sellerId;
    if (filter.xmlGenerated !== undefined) where.xmlGenerated = filter.xmlGenerated;
    if (filter.approvalStatus) where.approvalStatus = filter.approvalStatus;

    const [invoices, total] = await Promise.all([
      this.prisma.taxInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lines: true, seller: true, buyer: true },
      }),
      this.prisma.taxInvoice.count({ where }),
    ]);

    return { data: invoices.map(i => this.mapToEntity(i)), total, page, limit };
  }

  async findById(id: string): Promise<TaxInvoice> {
    const invoice = await this.prisma.taxInvoice.findUnique({
      where: { id },
      include: { lines: true, seller: true, buyer: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Tax invoice with ID ${id} not found`);
    }

    return this.mapToEntity(invoice);
  }

  async generateXml(id: string, userId: string): Promise<XmlGenerationResult> {
    this.logger.log(`Generating XML for tax invoice: ${id}`);

    const invoice = await this.findById(id);
    const validation = this.validator.validateTaxInvoice(invoice);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return { success: false, error: 'Company configuration not found' };
    }

    const result = this.xmlGenerator.generateVatOutXml([invoice], companyConfig.companyTin);

    if (result.success && result.content) {
      await this.prisma.taxInvoice.update({
        where: { id },
        data: {
          xmlGenerated: true,
          xmlGeneratedAt: new Date(),
          xmlFileName: result.fileName,
          xmlContent: result.content,
          updatedBy: userId,
        },
      });

      await this.prisma.xmlGenerationLog.create({
        data: {
          documentType: 'TAX_INVOICE',
          documentId: id,
          fileName: result.fileName || '',
          fileSize: result.content.length,
          status: 'SUCCESS',
          generatedBy: userId,
        },
      });
    }

    return result;
  }

  async generateBulkXml(ids: string[], userId: string): Promise<XmlGenerationResult> {
    this.logger.log(`Generating bulk XML for ${ids.length} tax invoices`);

    const invoices: TaxInvoice[] = [];
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const invoice = await this.findById(id);
        const validation = this.validator.validateTaxInvoice(invoice);
        if (validation.isValid) {
          invoices.push(invoice);
        } else {
          errors.push(`Invoice ${id}: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      } catch (error) {
        errors.push(`Invoice ${id}: ${error.message}`);
      }
    }

    if (invoices.length === 0) {
      return {
        success: false,
        error: `No valid invoices to export. Errors: ${errors.join('; ')}`,
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return { success: false, error: 'Company configuration not found' };
    }

    const result = this.xmlGenerator.generateVatOutXml(invoices, companyConfig.companyTin);

    if (result.success) {
      // FIX (Bug #5): Wrap all updates in a single transaction.
      // Previously: sequential for..await without transaction — partial failure
      // left some invoices marked xmlGenerated=true without a complete XML.
      await this.prisma.$transaction(
        invoices.map((invoice) =>
          this.prisma.taxInvoice.update({
            where: { id: invoice.id },
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

    return result;
  }

  async validateForExport(id: string): Promise<ValidationSummary> {
    const invoice = await this.findById(id);
    return this.validator.validateTaxInvoice(invoice);
  }

  async markAsApproved(id: string, approvalNumber: string): Promise<TaxInvoice> {
    // FIX (Bug #6): Validate status before approving.
    // Previously: any invoice could be approved regardless of state.
    const existing = await this.prisma.taxInvoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tax invoice with ID ${id} not found`);
    }

    const allowedStatuses = ['PENDING', 'SUBMITTED', 'XML_GENERATED'];
    if (!allowedStatuses.includes(existing.approvalStatus || '')) {
      throw new BadRequestException(
        `Cannot approve invoice in status "${existing.approvalStatus || 'NONE'}". ` +
        `Allowed statuses: ${allowedStatuses.join(', ')}`
      );
    }

    if (!existing.xmlGenerated) {
      throw new BadRequestException('XML must be generated before approving the invoice');
    }

    const invoice = await this.prisma.taxInvoice.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvalDate: new Date(),
        approvalNumber,
      },
      include: { lines: true, seller: true, buyer: true },
    });

    return this.mapToEntity(invoice);
  }

  private mapToEntity(data: any): TaxInvoice {
    return new TaxInvoice({
      id: data.id,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      invoiceType: data.invoiceType,
      invoiceOption: data.invoiceOption,
      referenceInvoiceId: data.referenceInvoiceId,
      taxPeriod: data.taxPeriod,
      taxYear: data.taxYear,
      taxMonth: data.taxMonth,
      transactionCode: data.transactionCode,
      additionalInfo: data.additionalInfo,
      customDoc: data.customDoc,
      customDocMonthYear: data.customDocMonthYear,
      referenceDesc: data.referenceDesc,
      facilityStamp: data.facilityStamp,
      sellerId: data.sellerId,
      sellerTin: data.sellerTin,
      sellerNitku: data.sellerNitku,
      buyerId: data.buyerId,
      buyerTin: data.buyerTin,
      buyerDocument: data.buyerDocument,
      buyerCountry: data.buyerCountry,
      buyerDocumentNumber: data.buyerDocumentNumber,
      buyerName: data.buyerName,
      buyerAddress: data.buyerAddress,
      buyerEmail: data.buyerEmail,
      buyerNitku: data.buyerNitku,
      isTaxInclusive: data.isTaxInclusive,
      vatRate: new Decimal(data.vatRate),
      totalDpp: new Decimal(data.totalDpp),
      totalPpn: new Decimal(data.totalPpn),
      totalPpnBm: new Decimal(data.totalPpnBm),
      totalDiscount: new Decimal(data.totalDiscount),
      grandTotal: new Decimal(data.grandTotal),
      lines: data.lines.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        productCode: line.productCode,
        productName: line.productName,
        productType: line.productType,
        unitCode: line.unitCode,
        unitName: line.unitName,
        quantity: new Decimal(line.quantity),
        price: new Decimal(line.price),
        discount: new Decimal(line.discount),
        totalPrice: new Decimal(line.totalPrice),
        dpp: new Decimal(line.dpp),
        otherTaxBase: line.otherTaxBase ? new Decimal(line.otherTaxBase) : undefined,
        vatRate: new Decimal(line.vatRate),
        vatAmount: new Decimal(line.vatAmount),
        ppnbmRate: new Decimal(line.ppnbmRate),
        ppnbmAmount: new Decimal(line.ppnbmAmount),
      })),
      xmlGenerated: data.xmlGenerated,
      xmlGeneratedAt: data.xmlGeneratedAt,
      xmlFileName: data.xmlFileName,
      xmlContent: data.xmlContent,
      approvalStatus: data.approvalStatus,
      approvalDate: data.approvalDate,
      approvalNumber: data.approvalNumber,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    });
  }
}
