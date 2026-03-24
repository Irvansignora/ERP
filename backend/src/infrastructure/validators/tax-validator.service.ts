import { Injectable, Logger } from '@nestjs/common';
import { Partner } from '@domain/entities/partner.entity';
import { TaxInvoice } from '@domain/entities/tax-invoice.entity';
import { WithholdingSlip } from '@domain/entities/withholding-slip.entity';

export interface ValidationResult {
  valid: boolean;
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface ValidationSummary {
  isValid: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  infos: ValidationResult[];
}

@Injectable()
export class TaxValidatorService {
  private readonly logger = new Logger(TaxValidatorService.name);

  // ============================================
  // NPWP VALIDATION
  // ============================================

  public validateNpwp15(npwp: string): ValidationResult {
    // NPWP 15 digits format: 99.999.999.9-999.999
    const cleanNpwp = npwp.replace(/[\.\-]/g, '');
    
    if (cleanNpwp.length !== 15) {
      return {
        valid: false,
        field: 'npwp15',
        message: `NPWP 15 must be 15 digits, got ${cleanNpwp.length}`,
        severity: 'ERROR',
      };
    }

    if (!/^\d{15}$/.test(cleanNpwp)) {
      return {
        valid: false,
        field: 'npwp15',
        message: 'NPWP 15 must contain only digits',
        severity: 'ERROR',
      };
    }

    return {
      valid: true,
      field: 'npwp15',
      message: 'NPWP 15 is valid',
      severity: 'INFO',
    };
  }

  public validateNpwp16(npwp: string): ValidationResult {
    // NPWP 16 digits format (CoreTax): 9999999999999999
    // Format: 2 digits (tax office code) + 4 digits + 4 digits + 2 digits + 4 digits
    
    if (!npwp || npwp.length !== 16) {
      return {
        valid: false,
        field: 'npwp16',
        message: `NPWP 16 must be exactly 16 digits, got ${npwp?.length || 0}`,
        severity: 'ERROR',
      };
    }

    if (!/^\d{16}$/.test(npwp)) {
      return {
        valid: false,
        field: 'npwp16',
        message: 'NPWP 16 must contain only digits',
        severity: 'ERROR',
      };
    }

    // Validate tax office code (first 2 digits)
    const taxOfficeCode = parseInt(npwp.substring(0, 2), 10);
    if (taxOfficeCode < 1 || taxOfficeCode > 99) {
      return {
        valid: false,
        field: 'npwp16',
        message: 'Invalid tax office code in NPWP',
        severity: 'ERROR',
      };
    }

    return {
      valid: true,
      field: 'npwp16',
      message: 'NPWP 16 is valid',
      severity: 'INFO',
    };
  }

  // ============================================
  // NIK VALIDATION
  // ============================================

  public validateNik(nik: string): ValidationResult {
    // NIK is 16 digits
    // Format: 2 digits (province) + 2 digits (city) + 2 digits (district) + 6 digits (date) + 4 digits (sequence)
    
    if (!nik || nik.length !== 16) {
      return {
        valid: false,
        field: 'nik',
        message: `NIK must be exactly 16 digits, got ${nik?.length || 0}`,
        severity: 'ERROR',
      };
    }

    if (!/^\d{16}$/.test(nik)) {
      return {
        valid: false,
        field: 'nik',
        message: 'NIK must contain only digits',
        severity: 'ERROR',
      };
    }

    // Validate province code (first 2 digits)
    const provinceCode = parseInt(nik.substring(0, 2), 10);
    if (provinceCode < 11 || provinceCode > 99) {
      return {
        valid: false,
        field: 'nik',
        message: 'Invalid province code in NIK',
        severity: 'WARNING',
      };
    }

    return {
      valid: true,
      field: 'nik',
      message: 'NIK is valid',
      severity: 'INFO',
    };
  }

  // ============================================
  // NITKU VALIDATION
  // ============================================

  public validateNitku(nitku: string): ValidationResult {
    // NITKU is 22 digits: 16 digits NPWP + 6 digits branch code
    
    if (!nitku || nitku.length !== 22) {
      return {
        valid: false,
        field: 'nitku',
        message: `NITKU must be exactly 22 digits, got ${nitku?.length || 0}`,
        severity: 'ERROR',
      };
    }

    if (!/^\d{22}$/.test(nitku)) {
      return {
        valid: false,
        field: 'nitku',
        message: 'NITKU must contain only digits',
        severity: 'ERROR',
      };
    }

    // Validate embedded NPWP (first 16 digits)
    const embeddedNpwp = nitku.substring(0, 16);
    const npwpValidation = this.validateNpwp16(embeddedNpwp);
    
    if (!npwpValidation.valid) {
      return {
        valid: false,
        field: 'nitku',
        message: 'Invalid NPWP embedded in NITKU',
        severity: 'ERROR',
      };
    }

    return {
      valid: true,
      field: 'nitku',
      message: 'NITKU is valid',
      severity: 'INFO',
    };
  }

  // ============================================
  // PARTNER VALIDATION
  // ============================================

  public validatePartner(partner: Partner): ValidationSummary {
    const results: ValidationResult[] = [];

    // Validate NPWP 16 (required for PKP)
    if (partner.npwp16) {
      results.push(this.validateNpwp16(partner.npwp16));
    } else if (partner.isPkp) {
      results.push({
        valid: false,
        field: 'npwp16',
        message: 'NPWP 16 is required for PKP partners',
        severity: 'ERROR',
      });
    }

    // Validate NIK
    if (partner.nik) {
      results.push(this.validateNik(partner.nik));
    }

    // Validate NITKU
    if (partner.nitku) {
      results.push(this.validateNitku(partner.nitku));
    }

    // Validate mandatory fields
    if (!partner.name || partner.name.trim().length < 3) {
      results.push({
        valid: false,
        field: 'name',
        message: 'Partner name is required and must be at least 3 characters',
        severity: 'ERROR',
      });
    }

    if (!partner.address || partner.address.trim().length < 10) {
      results.push({
        valid: false,
        field: 'address',
        message: 'Address is required and must be at least 10 characters',
        severity: 'ERROR',
      });
    }

    if (!partner.countryCode) {
      results.push({
        valid: false,
        field: 'countryCode',
        message: 'Country code is required',
        severity: 'ERROR',
      });
    }

    // Validate email format if provided
    if (partner.email && !this.isValidEmail(partner.email)) {
      results.push({
        valid: false,
        field: 'email',
        message: 'Invalid email format',
        severity: 'WARNING',
      });
    }

    // Validate phone if provided
    if (partner.phone && partner.phone.length < 7) {
      results.push({
        valid: false,
        field: 'phone',
        message: 'Phone number must be at least 7 digits',
        severity: 'WARNING',
      });
    }

    // Validate employee-specific fields
    if (partner.isEmployee) {
      if (!partner.ptkpStatus) {
        results.push({
          valid: false,
          field: 'ptkpStatus',
          message: 'PTKP status is required for employees',
          severity: 'ERROR',
        });
      }
      if (!partner.terCategory) {
        results.push({
          valid: false,
          field: 'terCategory',
          message: 'TER category is required for employees',
          severity: 'ERROR',
        });
      }
    }

    return this.summarizeResults(results);
  }

  // ============================================
  // TAX INVOICE VALIDATION
  // ============================================

  public validateTaxInvoice(invoice: TaxInvoice): ValidationSummary {
    const results: ValidationResult[] = [];

    // Validate invoice number
    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim().length < 3) {
      results.push({
        valid: false,
        field: 'invoiceNumber',
        message: 'Invoice number is required',
        severity: 'ERROR',
      });
    }

    // Validate invoice date
    if (!invoice.invoiceDate) {
      results.push({
        valid: false,
        field: 'invoiceDate',
        message: 'Invoice date is required',
        severity: 'ERROR',
      });
    }

    // Validate seller TIN
    if (!invoice.sellerTin || invoice.sellerTin.length !== 16) {
      results.push({
        valid: false,
        field: 'sellerTin',
        message: 'Seller TIN must be 16 digits',
        severity: 'ERROR',
      });
    } else {
      const tinValidation = this.validateNpwp16(invoice.sellerTin);
      if (!tinValidation.valid) {
        results.push({
          valid: false,
          field: 'sellerTin',
          message: tinValidation.message,
          severity: 'ERROR',
        });
      }
    }

    // Validate seller NITKU
    if (!invoice.sellerNitku || invoice.sellerNitku.length !== 22) {
      results.push({
        valid: false,
        field: 'sellerNitku',
        message: 'Seller NITKU must be 22 digits',
        severity: 'ERROR',
      });
    }

    // Validate buyer TIN
    if (!invoice.buyerTin || invoice.buyerTin.length !== 16) {
      results.push({
        valid: false,
        field: 'buyerTin',
        message: 'Buyer TIN must be 16 digits',
        severity: 'ERROR',
      });
    } else {
      const tinValidation = this.validateNpwp16(invoice.buyerTin);
      if (!tinValidation.valid) {
        results.push({
          valid: false,
          field: 'buyerTin',
          message: tinValidation.message,
          severity: 'ERROR',
        });
      }
    }

    // Validate buyer NITKU
    if (!invoice.buyerNitku || invoice.buyerNitku.length !== 22) {
      results.push({
        valid: false,
        field: 'buyerNitku',
        message: 'Buyer NITKU must be 22 digits',
        severity: 'ERROR',
      });
    }

    // Validate buyer name
    if (!invoice.buyerName || invoice.buyerName.trim().length < 3) {
      results.push({
        valid: false,
        field: 'buyerName',
        message: 'Buyer name is required',
        severity: 'ERROR',
      });
    }

    // Validate buyer address
    if (!invoice.buyerAddress || invoice.buyerAddress.trim().length < 10) {
      results.push({
        valid: false,
        field: 'buyerAddress',
        message: 'Buyer address is required and must be at least 10 characters',
        severity: 'ERROR',
      });
    }

    // Validate lines
    if (!invoice.lines || invoice.lines.length === 0) {
      results.push({
        valid: false,
        field: 'lines',
        message: 'At least one line item is required',
        severity: 'ERROR',
      });
    } else {
      for (let i = 0; i < invoice.lines.length; i++) {
        const line = invoice.lines[i];
        
        if (!line.productCode) {
          results.push({
            valid: false,
            field: `lines[${i}].productCode`,
            message: `Product code is required for line ${i + 1}`,
            severity: 'ERROR',
          });
        }

        if (!line.productName || line.productName.trim().length < 3) {
          results.push({
            valid: false,
            field: `lines[${i}].productName`,
            message: `Product name is required for line ${i + 1}`,
            severity: 'ERROR',
          });
        }

        if (line.quantity.lessThanOrEqualTo(0)) {
          results.push({
            valid: false,
            field: `lines[${i}].quantity`,
            message: `Quantity must be greater than 0 for line ${i + 1}`,
            severity: 'ERROR',
          });
        }

        if (line.price.lessThanOrEqualTo(0)) {
          results.push({
            valid: false,
            field: `lines[${i}].price`,
            message: `Price must be greater than 0 for line ${i + 1}`,
            severity: 'ERROR',
          });
        }
      }
    }

    // Validate totals
    if (invoice.totalDpp.lessThanOrEqualTo(0)) {
      results.push({
        valid: false,
        field: 'totalDpp',
        message: 'Total DPP must be greater than 0',
        severity: 'ERROR',
      });
    }

    return this.summarizeResults(results);
  }

  // ============================================
  // WITHHOLDING SLIP VALIDATION
  // ============================================

  public validateWithholdingSlip(slip: WithholdingSlip): ValidationSummary {
    const results: ValidationResult[] = [];

    // Validate slip number
    if (!slip.slipNumber || slip.slipNumber.trim().length < 3) {
      results.push({
        valid: false,
        field: 'slipNumber',
        message: 'Slip number is required',
        severity: 'ERROR',
      });
    }

    // Validate withholder TIN
    if (!slip.withholderTin || slip.withholderTin.length !== 16) {
      results.push({
        valid: false,
        field: 'withholderTin',
        message: 'Withholder TIN must be 16 digits',
        severity: 'ERROR',
      });
    }

    // Validate withholder NITKU
    if (!slip.withholderNitku || slip.withholderNitku.length !== 22) {
      results.push({
        valid: false,
        field: 'withholderNitku',
        message: 'Withholder NITKU must be 22 digits',
        severity: 'ERROR',
      });
    }

    // Validate subject
    if (!slip.subjectName || slip.subjectName.trim().length < 3) {
      results.push({
        valid: false,
        field: 'subjectName',
        message: 'Subject name is required',
        severity: 'ERROR',
      });
    }

    // Validate subject TIN or NIK (at least one required)
    if (!slip.subjectTin && !slip.subjectNik) {
      results.push({
        valid: false,
        field: 'subjectTin',
        message: 'Either Subject TIN or NIK is required',
        severity: 'ERROR',
      });
    }

    if (slip.subjectTin) {
      const tinValidation = this.validateNpwp16(slip.subjectTin);
      if (!tinValidation.valid) {
        results.push({
          valid: false,
          field: 'subjectTin',
          message: tinValidation.message,
          severity: 'ERROR',
        });
      }
    }

    if (slip.subjectNik) {
      const nikValidation = this.validateNik(slip.subjectNik);
      if (!nikValidation.valid) {
        results.push({
          valid: false,
          field: 'subjectNik',
          message: nikValidation.message,
          severity: 'ERROR',
        });
      }
    }

    // Validate tax object code
    if (!slip.taxObjectCode) {
      results.push({
        valid: false,
        field: 'taxObjectCode',
        message: 'Tax object code is required',
        severity: 'ERROR',
      });
    }

    // Validate income amount
    if (slip.incomeAmount.lessThanOrEqualTo(0)) {
      results.push({
        valid: false,
        field: 'incomeAmount',
        message: 'Income amount must be greater than 0',
        severity: 'ERROR',
      });
    }

    // Validate tax rate
    if (slip.taxRate.lessThanOrEqualTo(0) || slip.taxRate.greaterThan(100)) {
      results.push({
        valid: false,
        field: 'taxRate',
        message: 'Tax rate must be between 0 and 100',
        severity: 'ERROR',
      });
    }

    // PPh 21 specific validation
    if (slip.slipType === 'PPH_21') {
      if (!slip.terCategory) {
        results.push({
          valid: false,
          field: 'terCategory',
          message: 'TER category is required for PPh 21',
          severity: 'ERROR',
        });
      }
    }

    return this.summarizeResults(results);
  }

  // ============================================
  // BATCH VALIDATION
  // ============================================

  public validatePartnersForXmlExport(partners: Partner[]): ValidationSummary {
    const allResults: ValidationResult[] = [];

    for (const partner of partners) {
      const summary = this.validatePartner(partner);
      allResults.push(...summary.errors, ...summary.warnings);
    }

    return this.summarizeResults(allResults);
  }

  public validateTaxInvoicesForXmlExport(invoices: TaxInvoice[]): ValidationSummary {
    const allResults: ValidationResult[] = [];

    for (const invoice of invoices) {
      const summary = this.validateTaxInvoice(invoice);
      allResults.push(...summary.errors, ...summary.warnings);
    }

    return this.summarizeResults(allResults);
  }

  public validateWithholdingSlipsForXmlExport(slips: WithholdingSlip[]): ValidationSummary {
    const allResults: ValidationResult[] = [];

    for (const slip of slips) {
      const summary = this.validateWithholdingSlip(slip);
      allResults.push(...summary.errors, ...summary.warnings);
    }

    return this.summarizeResults(allResults);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private summarizeResults(results: ValidationResult[]): ValidationSummary {
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
}
