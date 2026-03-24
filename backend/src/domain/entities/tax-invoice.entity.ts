import { Decimal } from 'decimal.js';

export enum InvoiceType {
  NORMAL = 'NORMAL',
  REPLACEMENT = 'REPLACEMENT',
  CANCELLATION = 'CANCELLATION',
}

export enum InvoiceOption {
  NORMAL = 'NORMAL',
  PENGGANTI = 'PENGGANTI',
}

export enum TransactionCode {
  KODE_01 = '01', // Regular delivery of taxable goods
  KODE_02 = '02', // Delivery to VAT collector
  KODE_03 = '03', // Delivery with VAT not collected
  KODE_04 = '04', // Delivery with VAT exempt
  KODE_05 = '05', // Delivery of luxury goods
  KODE_06 = '06', // Delivery to bonded zone
  KODE_07 = '07', // Delivery with VAT borne by government
  KODE_08 = '08', // Delivery with DPP other than selling price
  KODE_09 = '09', // Other deliveries
}

export enum DocumentType {
  TIN = 'TIN',
  NIK = 'NIK',
  PASSPORT = 'PASSPORT',
}

export interface TaxInvoiceLineProps {
  id: string;
  lineNumber: number;
  productCode: string;
  productName: string;
  productType: 'B' | 'J'; // B = Barang, J = Jasa
  unitCode: string;
  unitName?: string;
  quantity: Decimal;
  price: Decimal;
  discount: Decimal;
  totalPrice: Decimal;
  dpp: Decimal;
  otherTaxBase?: Decimal;
  vatRate: Decimal;
  vatAmount: Decimal;
  ppnbmRate: Decimal;
  ppnbmAmount: Decimal;
}

export interface TaxInvoiceProps {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType: InvoiceType;
  invoiceOption: InvoiceOption;
  referenceInvoiceId?: string;
  
  // Tax Period
  taxPeriod: string; // MM-YYYY
  taxYear: number;
  taxMonth: number;
  
  // Transaction
  transactionCode: TransactionCode;
  additionalInfo?: string;
  customDoc?: string;
  customDocMonthYear?: string;
  referenceDesc?: string;
  facilityStamp?: string;
  
  // Seller
  sellerId: string;
  sellerTin: string;
  sellerNitku: string;
  
  // Buyer
  buyerId: string;
  buyerTin: string;
  buyerDocument: DocumentType;
  buyerDocumentNumber?: string;
  buyerCountry: string;
  buyerName: string;
  buyerAddress: string;
  buyerEmail?: string;
  buyerNitku: string;
  
  // Tax Calculation
  isTaxInclusive: boolean;
  vatRate: Decimal;
  
  // Totals
  totalDpp: Decimal;
  totalPpn: Decimal;
  totalPpnBm: Decimal;
  totalDiscount: Decimal;
  grandTotal: Decimal;
  
  // Lines
  lines: TaxInvoiceLineProps[];
  
  // XML Status
  xmlGenerated: boolean;
  xmlGeneratedAt?: Date;
  xmlFileName?: string;
  xmlContent?: string;
  
  // Approval
  approvalStatus?: string;
  approvalDate?: Date;
  approvalNumber?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export class TaxInvoiceLine {
  constructor(private readonly props: TaxInvoiceLineProps) {
    this.validate();
  }

  private validate(): void {
    if (this.props.quantity.lessThanOrEqualTo(0)) {
      throw new Error('Quantity must be greater than 0');
    }
    if (this.props.price.lessThanOrEqualTo(0)) {
      throw new Error('Price must be greater than 0');
    }
    if (this.props.vatRate.lessThan(0) || this.props.vatRate.greaterThan(100)) {
      throw new Error('VAT rate must be between 0 and 100');
    }
  }

  get id(): string { return this.props.id; }
  get lineNumber(): number { return this.props.lineNumber; }
  get productCode(): string { return this.props.productCode; }
  get productName(): string { return this.props.productName; }
  get productType(): 'B' | 'J' { return this.props.productType; }
  get unitCode(): string { return this.props.unitCode; }
  get quantity(): Decimal { return this.props.quantity; }
  get price(): Decimal { return this.props.price; }
  get discount(): Decimal { return this.props.discount; }
  get totalPrice(): Decimal { return this.props.totalPrice; }
  get dpp(): Decimal { return this.props.dpp; }
  get otherTaxBase(): Decimal | undefined { return this.props.otherTaxBase; }
  get vatRate(): Decimal { return this.props.vatRate; }
  get vatAmount(): Decimal { return this.props.vatAmount; }
  get ppnbmRate(): Decimal { return this.props.ppnbmRate; }
  get ppnbmAmount(): Decimal { return this.props.ppnbmAmount; }

  public toJSON(): TaxInvoiceLineProps {
    return { ...this.props };
  }

  public static create(props: Omit<TaxInvoiceLineProps, 'id'>): TaxInvoiceLine {
    return new TaxInvoiceLine({
      ...props,
      id: crypto.randomUUID(),
    });
  }
}

export class TaxInvoice {
  private readonly props: TaxInvoiceProps;

  constructor(props: TaxInvoiceProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    if (!this.props.invoiceNumber) {
      throw new Error('Invoice number is required');
    }
    if (!this.props.sellerTin || this.props.sellerTin.length !== 16) {
      throw new Error('Seller TIN must be 16 digits');
    }
    if (!this.props.buyerTin || this.props.buyerTin.length !== 16) {
      throw new Error('Buyer TIN must be 16 digits');
    }
    if (this.props.lines.length === 0) {
      throw new Error('At least one line item is required');
    }
    
    // Validate totals match lines
    const calculatedDpp = this.props.lines.reduce((sum, line) => sum.plus(line.dpp), new Decimal(0));
    const calculatedPpn = this.props.lines.reduce((sum, line) => sum.plus(line.vatAmount), new Decimal(0));
    
    if (!calculatedDpp.equals(this.props.totalDpp)) {
      throw new Error(`Total DPP mismatch: expected ${calculatedDpp}, got ${this.props.totalDpp}`);
    }
    if (!calculatedPpn.equals(this.props.totalPpn)) {
      throw new Error(`Total PPN mismatch: expected ${calculatedPpn}, got ${this.props.totalPpn}`);
    }
  }

  // Getters
  get id(): string { return this.props.id; }
  get invoiceNumber(): string { return this.props.invoiceNumber; }
  get invoiceDate(): Date { return this.props.invoiceDate; }
  get invoiceType(): InvoiceType { return this.props.invoiceType; }
  get invoiceOption(): InvoiceOption { return this.props.invoiceOption; }
  get taxPeriod(): string { return this.props.taxPeriod; }
  get taxYear(): number { return this.props.taxYear; }
  get taxMonth(): number { return this.props.taxMonth; }
  get transactionCode(): TransactionCode { return this.props.transactionCode; }
  get sellerId(): string { return this.props.sellerId; }
  get sellerTin(): string { return this.props.sellerTin; }
  get sellerNitku(): string { return this.props.sellerNitku; }
  get buyerId(): string { return this.props.buyerId; }
  get buyerTin(): string { return this.props.buyerTin; }
  get buyerDocument(): DocumentType { return this.props.buyerDocument; }
  get buyerCountry(): string { return this.props.buyerCountry; }
  get buyerName(): string { return this.props.buyerName; }
  get buyerAddress(): string { return this.props.buyerAddress; }
  get buyerEmail(): string | undefined { return this.props.buyerEmail; }
  get buyerNitku(): string { return this.props.buyerNitku; }
  get isTaxInclusive(): boolean { return this.props.isTaxInclusive; }
  get vatRate(): Decimal { return this.props.vatRate; }
  get totalDpp(): Decimal { return this.props.totalDpp; }
  get totalPpn(): Decimal { return this.props.totalPpn; }
  get totalPpnBm(): Decimal { return this.props.totalPpnBm; }
  get totalDiscount(): Decimal { return this.props.totalDiscount; }
  get grandTotal(): Decimal { return this.props.grandTotal; }
  get lines(): TaxInvoiceLineProps[] { return this.props.lines; }
  get xmlGenerated(): boolean { return this.props.xmlGenerated; }
  get xmlGeneratedAt(): Date | undefined { return this.props.xmlGeneratedAt; }
  get xmlFileName(): string | undefined { return this.props.xmlFileName; }
  get xmlContent(): string | undefined { return this.props.xmlContent; }
  get approvalStatus(): string | undefined { return this.props.approvalStatus; }
  get approvalNumber(): string | undefined { return this.props.approvalNumber; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business methods
  public markAsXmlGenerated(fileName: string, content: string): void {
    this.props.xmlGenerated = true;
    this.props.xmlGeneratedAt = new Date();
    this.props.xmlFileName = fileName;
    this.props.xmlContent = content;
    this.props.updatedAt = new Date();
  }

  public markAsApproved(approvalNumber: string): void {
    this.props.approvalStatus = 'APPROVED';
    this.props.approvalDate = new Date();
    this.props.approvalNumber = approvalNumber;
    this.props.updatedAt = new Date();
  }

  public markAsRejected(reason: string): void {
    this.props.approvalStatus = 'REJECTED';
    this.props.updatedAt = new Date();
  }

  public calculateTotals(): { dpp: Decimal; ppn: Decimal; grandTotal: Decimal } {
    const dpp = this.props.lines.reduce((sum, line) => sum.plus(line.dpp), new Decimal(0));
    const ppn = this.props.lines.reduce((sum, line) => sum.plus(line.vatAmount), new Decimal(0));
    const ppnbm = this.props.lines.reduce((sum, line) => sum.plus(line.ppnbmAmount), new Decimal(0));
    const grandTotal = dpp.plus(ppn).plus(ppnbm);
    
    return { dpp, ppn, grandTotal };
  }

  public toJSON(): TaxInvoiceProps {
    return { ...this.props };
  }

  // Static factory method
  public static create(
    props: Omit<TaxInvoiceProps, 'id' | 'createdAt' | 'updatedAt' | 'xmlGenerated'>
  ): TaxInvoice {
    return new TaxInvoice({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      xmlGenerated: false,
    });
  }

  // Helper method to calculate line items
  public static calculateLine(
    quantity: Decimal,
    price: Decimal,
    discount: Decimal,
    vatRate: Decimal,
    isTaxInclusive: boolean
  ): { dpp: Decimal; vatAmount: Decimal; totalPrice: Decimal } {
    const totalBeforeDiscount = quantity.times(price);
    const totalAfterDiscount = totalBeforeDiscount.minus(discount);
    
    let dpp: Decimal;
    let vatAmount: Decimal;
    
    if (isTaxInclusive) {
      // Tax inclusive: price includes VAT
      // DPP = Total / (1 + VAT Rate/100)
      dpp = totalAfterDiscount.dividedBy(vatRate.dividedBy(100).plus(1));
      vatAmount = totalAfterDiscount.minus(dpp);
    } else {
      // Tax exclusive: price excludes VAT
      dpp = totalAfterDiscount;
      vatAmount = dpp.times(vatRate.dividedBy(100));
    }
    
    return {
      dpp: dpp.toDecimalPlaces(0), // Round to 0 decimal places for IDR
      vatAmount: vatAmount.toDecimalPlaces(0),
      totalPrice: totalAfterDiscount.toDecimalPlaces(0),
    };
  }
}
