import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Decimal } from 'decimal.js';

export interface TaxSummary {
  period: string;
  vatOut: {
    totalDpp: Decimal;
    totalPpn: Decimal;
    count: number;
  };
  vatIn: {
    totalDpp: Decimal;
    totalPpn: Decimal;
    count: number;
  };
  netVat: Decimal;
  pph21: {
    totalTax: Decimal;
    count: number;
  };
  pph23: {
    totalTax: Decimal;
    count: number;
  };
  pph4Ayat2: {
    totalTax: Decimal;
    count: number;
  };
  totalWithholdingTax: Decimal;
}

export interface ValidationReport {
  documentType: string;
  documentId: string;
  documentNumber: string;
  status: 'VALID' | 'INVALID';
  errors: string[];
  warnings: string[];
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTaxSummary(period: string): Promise<TaxSummary> {
    const [taxYear, taxMonth] = period.split('-').map(Number);
    
    // Get VAT Out (Pajak Keluaran)
    const vatOutInvoices = await this.prisma.taxInvoice.findMany({
      where: {
        taxYear,
        taxMonth,
      },
    });

    const vatOut = {
      totalDpp: vatOutInvoices.reduce((sum, inv) => sum.plus(inv.totalDpp), new Decimal(0)),
      totalPpn: vatOutInvoices.reduce((sum, inv) => sum.plus(inv.totalPpn), new Decimal(0)),
      count: vatOutInvoices.length,
    };

    // Get Withholding Slips
    const withholdingSlips = await this.prisma.withholdingSlip.findMany({
      where: {
        taxYear,
        taxMonth,
      },
    });

    const pph21 = {
      totalTax: withholdingSlips
        .filter(s => s.slipType === 'PPH_21')
        .reduce((sum, s) => sum.plus(s.taxAmount), new Decimal(0)),
      count: withholdingSlips.filter(s => s.slipType === 'PPH_21').length,
    };

    const pph23 = {
      totalTax: withholdingSlips
        .filter(s => s.slipType === 'PPH_23')
        .reduce((sum, s) => sum.plus(s.taxAmount), new Decimal(0)),
      count: withholdingSlips.filter(s => s.slipType === 'PPH_23').length,
    };

    const pph4Ayat2 = {
      totalTax: withholdingSlips
        .filter(s => s.slipType === 'PPH_4_AYAT_2')
        .reduce((sum, s) => sum.plus(s.taxAmount), new Decimal(0)),
      count: withholdingSlips.filter(s => s.slipType === 'PPH_4_AYAT_2').length,
    };

    const totalWithholdingTax = pph21.totalTax.plus(pph23.totalTax).plus(pph4Ayat2.totalTax);

    // Net VAT (simplified - in real scenario would subtract VAT In)
    const netVat = vatOut.totalPpn;

    return {
      period,
      vatOut,
      vatIn: { totalDpp: new Decimal(0), totalPpn: new Decimal(0), count: 0 },
      netVat,
      pph21,
      pph23,
      pph4Ayat2,
      totalWithholdingTax,
    };
  }

  async runPreValidation(period: string): Promise<ValidationReport[]> {
    const [taxYear, taxMonth] = period.split('-').map(Number);
    const reports: ValidationReport[] = [];

    // Validate Tax Invoices
    const taxInvoices = await this.prisma.taxInvoice.findMany({
      where: { taxYear, taxMonth },
      include: { seller: true, buyer: true },
    });

    for (const invoice of taxInvoices) {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!invoice.sellerTin || invoice.sellerTin.length !== 16) {
        errors.push('Seller TIN must be 16 digits');
      }

      if (!invoice.buyerTin || invoice.buyerTin.length !== 16) {
        errors.push('Buyer TIN must be 16 digits');
      }

      if (!invoice.buyerAddress || invoice.buyerAddress.length < 10) {
        errors.push('Buyer address is required and must be at least 10 characters');
      }

      if (!invoice.xmlGenerated) {
        warnings.push('XML not yet generated');
      }

      reports.push({
        documentType: 'TAX_INVOICE',
        documentId: invoice.id,
        documentNumber: invoice.invoiceNumber,
        status: errors.length === 0 ? 'VALID' : 'INVALID',
        errors,
        warnings,
      });
    }

    // Validate Withholding Slips
    const withholdingSlips = await this.prisma.withholdingSlip.findMany({
      where: { taxYear, taxMonth },
      include: { subject: true },
    });

    for (const slip of withholdingSlips) {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!slip.subjectTin && !slip.subjectNik) {
        errors.push('Subject must have either TIN or NIK');
      }

      if (slip.subjectTin && slip.subjectTin.length !== 16) {
        errors.push('Subject TIN must be 16 digits');
      }

      if (!slip.xmlGenerated) {
        warnings.push('XML not yet generated');
      }

      reports.push({
        documentType: 'WITHHOLDING_SLIP',
        documentId: slip.id,
        documentNumber: slip.slipNumber,
        status: errors.length === 0 ? 'VALID' : 'INVALID',
        errors,
        warnings,
      });
    }

    return reports;
  }

  async getXmlGenerationHistory(documentType?: string, limit: number = 50) {
    return this.prisma.xmlGenerationLog.findMany({
      where: documentType ? { documentType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTaxMapping() {
    return this.prisma.taxMapping.findMany({
      where: { isActive: true },
      orderBy: { taxType: 'asc' },
    });
  }
}
