import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { XmlGeneratorService, XmlGenerationResult } from '@infrastructure/xml/xml-generator.service';
import { TaxValidatorService, ValidationSummary } from '@infrastructure/validators/tax-validator.service';
import { TaxInvoice } from '@domain/entities/tax-invoice.entity';
import { WithholdingSlip } from '@domain/entities/withholding-slip.entity';
import { Decimal } from 'decimal.js';

export interface ExportOptions {
  period?: string;
  ids?: string[];
  documentType: 'TAX_INVOICE' | 'PPH_21' | 'PPH_UNIFIKASI';
}

@Injectable()
export class XmlExportService {
  private readonly logger = new Logger(XmlExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly validator: TaxValidatorService,
  ) {}

  async exportTaxInvoices(options: ExportOptions): Promise<XmlGenerationResult> {
    this.logger.log(`Exporting tax invoices with options: ${JSON.stringify(options)}`);

    let invoices: any[];

    if (options.ids && options.ids.length > 0) {
      invoices = await this.prisma.taxInvoice.findMany({
        where: {
          id: { in: options.ids },
        },
        include: {
          lines: true,
          seller: true,
          buyer: true,
        },
      });
    } else if (options.period) {
      const [taxYear, taxMonth] = options.period.split('-').map(Number);
      invoices = await this.prisma.taxInvoice.findMany({
        where: {
          taxYear,
          taxMonth,
        },
        include: {
          lines: true,
          seller: true,
          buyer: true,
        },
      });
    } else {
      return {
        success: false,
        error: 'Either ids or period must be provided',
      };
    }

    if (invoices.length === 0) {
      return {
        success: false,
        error: 'No tax invoices found for the given criteria',
      };
    }

    // Validate all invoices
    const validationErrors: string[] = [];
    for (const invoice of invoices) {
      const mappedInvoice = this.mapToTaxInvoiceEntity(invoice);
      const validation = this.validator.validateTaxInvoice(mappedInvoice);
      if (!validation.isValid) {
        validationErrors.push(
          `Invoice ${invoice.invoiceNumber}: ${validation.errors.map(e => e.message).join(', ')}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation failed:\n${validationErrors.join('\n')}`,
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return {
        success: false,
        error: 'Company configuration not found',
      };
    }

    const mappedInvoices = invoices.map(i => this.mapToTaxInvoiceEntity(i));
    return this.xmlGenerator.generateVatOutXml(mappedInvoices, companyConfig.companyTin);
  }

  async exportPph21(options: ExportOptions): Promise<XmlGenerationResult> {
    this.logger.log(`Exporting PPh 21 with options: ${JSON.stringify(options)}`);

    let slips: any[];

    if (options.ids && options.ids.length > 0) {
      slips = await this.prisma.withholdingSlip.findMany({
        where: {
          id: { in: options.ids },
          slipType: 'PPH_21',
        },
        include: {
          subject: true,
        },
      });
    } else if (options.period) {
      const [taxYear, taxMonth] = options.period.split('-').map(Number);
      slips = await this.prisma.withholdingSlip.findMany({
        where: {
          taxYear,
          taxMonth,
          slipType: 'PPH_21',
        },
        include: {
          subject: true,
        },
      });
    } else {
      return {
        success: false,
        error: 'Either ids or period must be provided',
      };
    }

    if (slips.length === 0) {
      return {
        success: false,
        error: 'No PPh 21 slips found for the given criteria',
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return {
        success: false,
        error: 'Company configuration not found',
      };
    }

    const mappedSlips = slips.map(s => this.mapToWithholdingSlipEntity(s));
    return this.xmlGenerator.generatePph21Xml(mappedSlips, companyConfig.companyTin);
  }

  async exportPphUnifikasi(options: ExportOptions): Promise<XmlGenerationResult> {
    this.logger.log(`Exporting PPh Unifikasi with options: ${JSON.stringify(options)}`);

    let slips: any[];

    if (options.ids && options.ids.length > 0) {
      slips = await this.prisma.withholdingSlip.findMany({
        where: {
          id: { in: options.ids },
          slipType: { not: 'PPH_21' },
        },
        include: {
          subject: true,
        },
      });
    } else if (options.period) {
      const [taxYear, taxMonth] = options.period.split('-').map(Number);
      slips = await this.prisma.withholdingSlip.findMany({
        where: {
          taxYear,
          taxMonth,
          slipType: { not: 'PPH_21' },
        },
        include: {
          subject: true,
        },
      });
    } else {
      return {
        success: false,
        error: 'Either ids or period must be provided',
      };
    }

    if (slips.length === 0) {
      return {
        success: false,
        error: 'No PPh Unifikasi slips found for the given criteria',
      };
    }

    const companyConfig = await this.prisma.companyConfig.findFirst();
    if (!companyConfig) {
      return {
        success: false,
        error: 'Company configuration not found',
      };
    }

    const mappedSlips = slips.map(s => this.mapToWithholdingSlipEntity(s));
    return this.xmlGenerator.generatePphUnifikasiXml(
      mappedSlips,
      companyConfig.companyTin,
      companyConfig.companyNitku,
    );
  }

  async validateForExport(options: ExportOptions): Promise<ValidationSummary> {
    const results: any[] = [];

    if (options.documentType === 'TAX_INVOICE') {
      let invoices: any[];

      if (options.ids && options.ids.length > 0) {
        invoices = await this.prisma.taxInvoice.findMany({
          where: { id: { in: options.ids } },
          include: { lines: true },
        });
      } else if (options.period) {
        const [taxYear, taxMonth] = options.period.split('-').map(Number);
        invoices = await this.prisma.taxInvoice.findMany({
          where: { taxYear, taxMonth },
          include: { lines: true },
        });
      }

      for (const invoice of invoices || []) {
        const mapped = this.mapToTaxInvoiceEntity(invoice);
        const validation = this.validator.validateTaxInvoice(mapped);
        results.push(...validation.errors, ...validation.warnings);
      }
    } else if (options.documentType === 'PPH_21' || options.documentType === 'PPH_UNIFIKASI') {
      let slips: any[];

      if (options.ids && options.ids.length > 0) {
        slips = await this.prisma.withholdingSlip.findMany({
          where: { 
            id: { in: options.ids },
            slipType: options.documentType === 'PPH_21' ? 'PPH_21' : { not: 'PPH_21' },
          },
        });
      } else if (options.period) {
        const [taxYear, taxMonth] = options.period.split('-').map(Number);
        slips = await this.prisma.withholdingSlip.findMany({
          where: { 
            taxYear, 
            taxMonth,
            slipType: options.documentType === 'PPH_21' ? 'PPH_21' : { not: 'PPH_21' },
          },
        });
      }

      for (const slip of slips || []) {
        const mapped = this.mapToWithholdingSlipEntity(slip);
        const validation = this.validator.validateWithholdingSlip(mapped);
        results.push(...validation.errors, ...validation.warnings);
      }
    }

    const errors = results.filter(r => r.severity === 'ERROR');
    const warnings = results.filter(r => r.severity === 'WARNING');
    const infos = results.filter(r => r.severity === 'INFO');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
    };
  }

  private mapToTaxInvoiceEntity(data: any): TaxInvoice {
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

  private mapToWithholdingSlipEntity(data: any): WithholdingSlip {
    return new WithholdingSlip({
      id: data.id,
      slipNumber: data.slipNumber,
      slipType: data.slipType,
      status: data.status,
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
      terCategory: data.terCategory,
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
