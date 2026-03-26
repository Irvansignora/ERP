import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { Decimal } from 'decimal.js';
import { TaxInvoice, TaxInvoiceLine } from '@domain/entities/tax-invoice.entity';
import { WithholdingSlip, WithholdingType } from '@domain/entities/withholding-slip.entity';

export interface XmlGenerationResult {
  success: boolean;
  fileName?: string;
  content?: string;
  error?: string;
}

@Injectable()
export class XmlGeneratorService {
  private readonly logger = new Logger(XmlGeneratorService.name);

  // ============================================
  // VAT OUT (PAJAK KELUARAN) XML GENERATOR
  // ============================================
  
  public generateVatOutXml(taxInvoices: TaxInvoice[], companyTin: string): XmlGenerationResult {
    try {
      this.logger.log(`Generating VAT Out XML for ${taxInvoices.length} invoices`);

      const doc = create({ version: '1.0', encoding: 'UTF-8' });
      
      const root = doc.ele('TaxInvoiceBulk', {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:noNamespaceSchemaLocation': 'TaxInvoice.xsd',
      });

      // TIN (16 digits)
      root.ele('TIN').txt(companyTin);

      // List of Tax Invoices
      const listOfTaxInvoice = root.ele('ListOfTaxInvoice');

      for (const invoice of taxInvoices) {
        this.addTaxInvoiceToXml(listOfTaxInvoice, invoice);
      }

      const xmlContent = doc.end({ prettyPrint: true });
      const fileName = `Faktur_Pajak_Keluaran_${companyTin}_${new Date().toISOString().split('T')[0]}.xml`;

      this.logger.log(`VAT Out XML generated successfully: ${fileName}`);

      return {
        success: true,
        fileName,
        content: xmlContent,
      };
    } catch (error) {
      this.logger.error('Failed to generate VAT Out XML', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private addTaxInvoiceToXml(parent: any, invoice: any): void {
    const taxInvoice = parent.ele('TaxInvoice');

    // Tax Invoice Date (YYYY-MM-DD)
    taxInvoice.ele('TaxInvoiceDate').txt(this.formatDate(invoice.invoiceDate));

    // Tax Invoice Option (Normal/Pengganti)
    taxInvoice.ele('TaxInvoiceOpt').txt(invoice.invoiceOption);

    // Transaction Code (Kode Transaksi)
    taxInvoice.ele('TrxCode').txt(invoice.transactionCode);

    // Additional Info (optional)
    taxInvoice.ele('AddInfo').txt(invoice.additionalInfo || '');

    // Custom Document (optional)
    taxInvoice.ele('CustomDoc').txt(invoice.customDoc || '');

    // Custom Document Month Year (optional)
    taxInvoice.ele('CustomDocMonthYear').txt(invoice.customDocMonthYear || '');

    // Reference Description (optional)
    taxInvoice.ele('RefDesc').txt(invoice.referenceDesc || '');

    // Facility Stamp (optional)
    taxInvoice.ele('FacilityStamp').txt(invoice.facilityStamp || '');

    // Seller ID TKU (22 digits: 16 NPWP + 6 branch code)
    taxInvoice.ele('SellerIDTKU').txt(invoice.sellerNitku);

    // Buyer TIN (16 digits)
    taxInvoice.ele('BuyerTin').txt(invoice.buyerTin);

    // Buyer Document Type (TIN/NIK/Passport)
    taxInvoice.ele('BuyerDocument').txt(invoice.buyerDocument);

    // Buyer Country Code
    taxInvoice.ele('BuyerCountry').txt(invoice.buyerCountry);

    // Buyer Document Number (for NIK/Passport)
    taxInvoice.ele('BuyerDocumentNumber').txt(invoice.buyerDocumentNumber || '');

    // Buyer Name
    taxInvoice.ele('BuyerName').txt(invoice.buyerName);

    // Buyer Address
    taxInvoice.ele('BuyerAdress').txt(invoice.buyerAddress);

    // Buyer Email
    taxInvoice.ele('BuyerEmail').txt(invoice.buyerEmail || '');

    // Buyer ID TKU (22 digits)
    taxInvoice.ele('BuyerIDTKU').txt(invoice.buyerNitku);

    // List of Goods/Services
    const listOfGoodService = taxInvoice.ele('ListOfGoodService');

    for (const line of invoice.lines) {
      this.addLineItemToXml(listOfGoodService, line);
    }
  }

  private addLineItemToXml(parent: any, line: any): void {
    const goodService = parent.ele('GoodService');

    // Option (A/B) - A for main goods, B for others
    goodService.ele('Opt').txt(line.productType);

    // Product Code (Kode Barang/Jasa)
    goodService.ele('Code').txt(line.productCode);

    // Product Name
    goodService.ele('Name').txt(line.productName);

    // Unit Code (UOM)
    goodService.ele('Unit').txt(line.unitCode);

    // Price per unit
    goodService.ele('Price').txt(this.formatDecimal(line.price));

    // Quantity
    goodService.ele('Qty').txt(this.formatDecimal(line.quantity));

    // Total Discount
    goodService.ele('TotalDiscount').txt(this.formatDecimal(line.discount));

    // Tax Base (DPP)
    goodService.ele('TaxBase').txt(this.formatDecimal(line.dpp));

    // Other Tax Base (DPP Nilai Lain)
    goodService.ele('OtherTaxBase').txt(
      line.otherTaxBase ? this.formatDecimal(line.otherTaxBase) : this.formatDecimal(line.dpp)
    );

    // VAT Rate
    goodService.ele('VATRate').txt(line.vatRate.toString());

    // VAT Amount
    goodService.ele('VAT').txt(this.formatDecimal(line.vatAmount));

    // PPnBM Rate
    goodService.ele('STLGRate').txt(line.ppnbmRate.toString());

    // PPnBM Amount
    goodService.ele('STLG').txt(this.formatDecimal(line.ppnbmAmount));
  }

  // ============================================
  // PPh 21 XML GENERATOR (TER System)
  // ============================================
  
  public generatePph21Xml(withholdingSlips: WithholdingSlip[], companyTin: string): XmlGenerationResult {
    try {
      this.logger.log(`Generating PPh 21 XML for ${withholdingSlips.length} slips`);

      const doc = create({ version: '1.0', encoding: 'UTF-8' });
      
      const root = doc.ele('PPh21Bulk', {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:noNamespaceSchemaLocation': 'PPh21.xsd',
      });

      // TIN (16 digits)
      root.ele('TIN').txt(companyTin);

      // List of Withholding Slips
      const listOfSlip = root.ele('ListOfWithholdingSlip');

      for (const slip of withholdingSlips) {
        if (slip.slipType !== WithholdingType.PPH_21) {
          continue;
        }
        this.addPph21SlipToXml(listOfSlip, slip);
      }

      const xmlContent = doc.end({ prettyPrint: true });
      const fileName = `Bupot_PPh21_${companyTin}_${new Date().toISOString().split('T')[0]}.xml`;

      this.logger.log(`PPh 21 XML generated successfully: ${fileName}`);

      return {
        success: true,
        fileName,
        content: xmlContent,
      };
    } catch (error) {
      this.logger.error('Failed to generate PPh 21 XML', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private addPph21SlipToXml(parent: any, slip: any): void {
    const slipElement = parent.ele('WithholdingSlip');

    // Slip Number
    slipElement.ele('SlipNumber').txt(slip.slipNumber);

    // Tax Period
    slipElement.ele('TaxPeriod').txt(slip.taxPeriod);

    // Subject Information
    slipElement.ele('SubjectTin').txt(slip.subjectTin || '');
    slipElement.ele('SubjectNik').txt(slip.subjectNik || '');
    slipElement.ele('SubjectName').txt(slip.subjectName);
    slipElement.ele('SubjectAddress').txt(slip.subjectAddress || '');
    slipElement.ele('SubjectNitku').txt(slip.subjectNitku || '');

    // Tax Object Code
    slipElement.ele('TaxObjectCode').txt(slip.taxObjectCode);

    // Income Amount
    slipElement.ele('IncomeAmount').txt(this.formatDecimal(slip.incomeAmount));

    // TER Category (A/B/C)
    if (slip.terCategory) {
      slipElement.ele('TerCategory').txt(slip.terCategory);
    }

    // TER Rate
    if (slip.terRate) {
      slipElement.ele('TerRate').txt(slip.terRate.toString());
    }

    // Tax Base
    slipElement.ele('TaxBase').txt(this.formatDecimal(slip.taxBase));

    // Tax Rate
    slipElement.ele('TaxRate').txt(slip.taxRate.toString());

    // Tax Amount
    slipElement.ele('TaxAmount').txt(this.formatDecimal(slip.taxAmount));

    // Document Reference
    slipElement.ele('DocumentNumber').txt(slip.documentNumber || '');
    if (slip.documentDate) {
      slipElement.ele('DocumentDate').txt(this.formatDate(slip.documentDate));
    }
  }

  // ============================================
  // PPh UNIFIKASI XML GENERATOR (23, 4(2), etc)
  // ============================================
  
  public generatePphUnifikasiXml(
    withholdingSlips: WithholdingSlip[], 
    companyTin: string,
    companyNitku: string
  ): XmlGenerationResult {
    try {
      this.logger.log(`Generating PPh Unifikasi XML for ${withholdingSlips.length} slips`);

      const doc = create({ version: '1.0', encoding: 'UTF-8' });
      
      const root = doc.ele('BuktiPotongUnifikasiBulk', {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:noNamespaceSchemaLocation': 'BuktiPotongUnifikasi.xsd',
      });

      // TIN (16 digits)
      root.ele('TIN').txt(companyTin);

      // NITKU (22 digits)
      root.ele('NITKU').txt(companyNitku);

      // List of Bukti Potong
      const listOfBupot = root.ele('ListOfBuktiPotong');

      for (const slip of withholdingSlips) {
        // Skip PPh 21, use separate XML
        if (slip.slipType === WithholdingType.PPH_21) {
          continue;
        }
        this.addPphUnifikasiSlipToXml(listOfBupot, slip);
      }

      const xmlContent = doc.end({ prettyPrint: true });
      const fileName = `Bupot_Unifikasi_${companyTin}_${new Date().toISOString().split('T')[0]}.xml`;

      this.logger.log(`PPh Unifikasi XML generated successfully: ${fileName}`);

      return {
        success: true,
        fileName,
        content: xmlContent,
      };
    } catch (error) {
      this.logger.error('Failed to generate PPh Unifikasi XML', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private addPphUnifikasiSlipToXml(parent: any, slip: any): void {
    const bupot = parent.ele('BuktiPotong');

    // Slip Number
    bupot.ele('NomorBuktiPotong').txt(slip.slipNumber);

    // Slip Type (PPh type)
    bupot.ele('JenisPajak').txt(this.mapWithholdingTypeToCode(slip.slipType));

    // Tax Period
    bupot.ele('MasaPajak').txt(slip.taxMonth.toString().padStart(2, '0'));
    bupot.ele('TahunPajak').txt(slip.taxYear.toString());

    // Subject Information
    bupot.ele('NpwpPenerimaPenghasilan').txt(slip.subjectTin || '');
    bupot.ele('NikPenerimaPenghasilan').txt(slip.subjectNik || '');
    bupot.ele('NamaPenerimaPenghasilan').txt(slip.subjectName);
    bupot.ele('AlamatPenerimaPenghasilan').txt(slip.subjectAddress || '');
    bupot.ele('NitkuPenerimaPenghasilan').txt(slip.subjectNitku || '');

    // Tax Object Code (Kode Objek Pajak)
    bupot.ele('KodeObjekPajak').txt(slip.taxObjectCode);

    // Document Reference
    bupot.ele('NomorDokumenReferensi').txt(slip.documentNumber || '');
    if (slip.documentDate) {
      bupot.ele('TanggalDokumenReferensi').txt(this.formatDate(slip.documentDate));
    }

    // Income Amount
    bupot.ele('JumlahPenghasilanBruto').txt(this.formatDecimal(slip.incomeAmount));

    // Tax Base
    bupot.ele('DasarPengenaanPajak').txt(this.formatDecimal(slip.taxBase));

    // Tax Rate
    bupot.ele('TarifPajak').txt(slip.taxRate.toString());

    // Tax Amount
    bupot.ele('JumlahPphDipotong').txt(this.formatDecimal(slip.taxAmount));

    // Supporting Document
    bupot.ele('JenisDokumenDasar').txt(slip.supportingDocType || '');
    bupot.ele('NomorDokumenDasar').txt(slip.supportingDocNumber || '');

    // Status
    bupot.ele('Status').txt(this.mapStatusToCode(slip.status));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDecimal(value: Decimal): string {
    // Remove decimal places, format as integer for IDR
    return value.toDecimalPlaces(0).toString();
  }

  private mapWithholdingTypeToCode(type: WithholdingType): string {
    const mapping: Record<WithholdingType, string> = {
      [WithholdingType.PPH_21]: '21',
      [WithholdingType.PPH_23]: '23',
      [WithholdingType.PPH_4_AYAT_2]: '42',
      [WithholdingType.PPH_15]: '15',
      [WithholdingType.PPH_22]: '22',
      [WithholdingType.PPH_26]: '26',
    };
    return mapping[type] || type;
  }

  private mapStatusToCode(status: string): string {
    const mapping: Record<string, string> = {
      'DRAFT': '0',
      'ISSUED': '1',
      'CANCELLED': '2',
      'AMENDED': '3',
    };
    return mapping[status] || '0';
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  public validateVatOutXml(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Basic XML structure validation
      if (!content.includes('<TaxInvoiceBulk')) {
        errors.push('Missing TaxInvoiceBulk root element');
      }
      if (!content.includes('<TIN>')) {
        errors.push('Missing TIN element');
      }
      if (!content.includes('<ListOfTaxInvoice>')) {
        errors.push('Missing ListOfTaxInvoice element');
      }

      // Validate TIN format (16 digits)
      const tinMatch = content.match(/<TIN>(\d+)<\/TIN>/);
      if (tinMatch && tinMatch[1].length !== 16) {
        errors.push(`Invalid TIN format: must be 16 digits, got ${tinMatch[1].length}`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`XML parsing error: ${error.message}`],
      };
    }
  }

  public validatePphUnifikasiXml(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      if (!content.includes('<BuktiPotongUnifikasiBulk')) {
        errors.push('Missing BuktiPotongUnifikasiBulk root element');
      }
      if (!content.includes('<TIN>')) {
        errors.push('Missing TIN element');
      }
      if (!content.includes('<NITKU>')) {
        errors.push('Missing NITKU element');
      }

      // Validate NITKU format (22 digits)
      const nitkuMatch = content.match(/<NITKU>(\d+)<\/NITKU>/);
      if (nitkuMatch && nitkuMatch[1].length !== 22) {
        errors.push(`Invalid NITKU format: must be 22 digits, got ${nitkuMatch[1].length}`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`XML parsing error: ${error.message}`],
      };
    }
  }
}
