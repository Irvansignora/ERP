import { Decimal } from 'decimal.js';

export enum WithholdingType {
  PPH_21 = 'PPH_21',
  PPH_23 = 'PPH_23',
  PPH_4_AYAT_2 = 'PPH_4_AYAT_2',
  PPH_15 = 'PPH_15',
  PPH_22 = 'PPH_22',
  PPH_26 = 'PPH_26',
}

export enum WithholdingStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
  AMENDED = 'AMENDED',
}

export enum TerCategory {
  A = 'A',
  B = 'B',
  C = 'C',
}

export interface WithholdingSlipProps {
  id: string;
  slipNumber: string;
  slipType: WithholdingType;
  status: WithholdingStatus;
  
  // Tax Period
  taxPeriod: string; // MM-YYYY
  taxYear: number;
  taxMonth: number;
  
  // Withholder (Pemotong)
  withholderTin: string; // 16 digits
  withholderNitku: string; // 22 digits
  withholderName: string;
  
  // Subject (Pihak Dipotong)
  subjectId: string;
  subjectTin?: string; // 16 digits
  subjectNik?: string; // 16 digits
  subjectName: string;
  subjectAddress?: string;
  subjectNitku?: string; // 22 digits
  
  // Tax Object
  taxObjectCode: string;
  taxObjectName: string;
  
  // Amounts
  incomeAmount: Decimal;
  taxBase: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  
  // PPh 21 TER Specific
  terCategory?: TerCategory;
  terRate?: Decimal;
  
  // Document Reference
  documentNumber?: string;
  documentDate?: Date;
  
  // Supporting Document
  supportingDocType?: string;
  supportingDocNumber?: string;
  
  // XML Status
  xmlGenerated: boolean;
  xmlGeneratedAt?: Date;
  xmlFileName?: string;
  xmlContent?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export class WithholdingSlip {
  private readonly props: WithholdingSlipProps;

  constructor(props: WithholdingSlipProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    if (!this.props.slipNumber) {
      throw new Error('Slip number is required');
    }
    if (!this.props.withholderTin || this.props.withholderTin.length !== 16) {
      throw new Error('Withholder TIN must be 16 digits');
    }
    if (!this.props.withholderNitku || this.props.withholderNitku.length !== 22) {
      throw new Error('Withholder NITKU must be 22 digits');
    }
    if (!this.props.subjectName) {
      throw new Error('Subject name is required');
    }
    if (!this.props.taxObjectCode) {
      throw new Error('Tax object code is required');
    }
    if (this.props.incomeAmount.lessThan(0)) {
      throw new Error('Income amount cannot be negative');
    }
    if (this.props.taxRate.lessThan(0) || this.props.taxRate.greaterThan(100)) {
      throw new Error('Tax rate must be between 0 and 100');
    }
    
    // Validate calculated tax amount
    const calculatedTax = this.props.taxBase.times(this.props.taxRate.dividedBy(100));
    const tolerance = new Decimal(1); // 1 IDR tolerance for rounding
    const diff = calculatedTax.minus(this.props.taxAmount).abs();
    
    if (diff.greaterThan(tolerance)) {
      throw new Error(`Tax amount mismatch: expected ~${calculatedTax}, got ${this.props.taxAmount}`);
    }
  }

  // Getters
  get id(): string { return this.props.id; }
  get slipNumber(): string { return this.props.slipNumber; }
  get slipType(): WithholdingType { return this.props.slipType; }
  get status(): WithholdingStatus { return this.props.status; }
  get taxPeriod(): string { return this.props.taxPeriod; }
  get taxYear(): number { return this.props.taxYear; }
  get taxMonth(): number { return this.props.taxMonth; }
  get withholderTin(): string { return this.props.withholderTin; }
  get withholderNitku(): string { return this.props.withholderNitku; }
  get withholderName(): string { return this.props.withholderName; }
  get subjectId(): string { return this.props.subjectId; }
  get subjectTin(): string | undefined { return this.props.subjectTin; }
  get subjectNik(): string | undefined { return this.props.subjectNik; }
  get subjectName(): string { return this.props.subjectName; }
  get subjectAddress(): string | undefined { return this.props.subjectAddress; }
  get subjectNitku(): string | undefined { return this.props.subjectNitku; }
  get taxObjectCode(): string { return this.props.taxObjectCode; }
  get taxObjectName(): string { return this.props.taxObjectName; }
  get incomeAmount(): Decimal { return this.props.incomeAmount; }
  get taxBase(): Decimal { return this.props.taxBase; }
  get taxRate(): Decimal { return this.props.taxRate; }
  get taxAmount(): Decimal { return this.props.taxAmount; }
  get terCategory(): TerCategory | undefined { return this.props.terCategory; }
  get terRate(): Decimal | undefined { return this.props.terRate; }
  get documentNumber(): string | undefined { return this.props.documentNumber; }
  get documentDate(): Date | undefined { return this.props.documentDate; }
  get xmlGenerated(): boolean { return this.props.xmlGenerated; }
  get xmlGeneratedAt(): Date | undefined { return this.props.xmlGeneratedAt; }
  get xmlFileName(): string | undefined { return this.props.xmlFileName; }
  get xmlContent(): string | undefined { return this.props.xmlContent; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business methods
  public issue(): void {
    if (this.props.status !== WithholdingStatus.DRAFT) {
      throw new Error('Only draft slips can be issued');
    }
    this.props.status = WithholdingStatus.ISSUED;
    this.props.updatedAt = new Date();
  }

  public cancel(): void {
    if (this.props.status !== WithholdingStatus.ISSUED) {
      throw new Error('Only issued slips can be cancelled');
    }
    this.props.status = WithholdingStatus.CANCELLED;
    this.props.updatedAt = new Date();
  }

  public amend(): void {
    if (this.props.status !== WithholdingStatus.ISSUED) {
      throw new Error('Only issued slips can be amended');
    }
    this.props.status = WithholdingStatus.AMENDED;
    this.props.updatedAt = new Date();
  }

  public markAsXmlGenerated(fileName: string, content: string): void {
    this.props.xmlGenerated = true;
    this.props.xmlGeneratedAt = new Date();
    this.props.xmlFileName = fileName;
    this.props.xmlContent = content;
    this.props.updatedAt = new Date();
  }

  public toJSON(): WithholdingSlipProps {
    return { ...this.props };
  }

  // Static factory method
  public static create(
    props: Omit<WithholdingSlipProps, 'id' | 'createdAt' | 'updatedAt' | 'xmlGenerated' | 'status'>
  ): WithholdingSlip {
    return new WithholdingSlip({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      xmlGenerated: false,
      status: WithholdingStatus.DRAFT,
    });
  }

  // PPh 21 TER Calculator
  public static calculatePph21Ter(
    grossIncome: Decimal,
    terCategory: TerCategory,
    isDaily: boolean = false
  ): { taxBase: Decimal; taxRate: Decimal; taxAmount: Decimal } {
    // TER rates based on PP 58/2023
    // These are example rates - actual rates should be configured
    const monthlyRates: Record<TerCategory, { threshold: Decimal; rate: Decimal }[]> = {
      [TerCategory.A]: [
        { threshold: new Decimal(5400000), rate: new Decimal(0) },
        { threshold: new Decimal(5650000), rate: new Decimal(0.25) },
        { threshold: new Decimal(5950000), rate: new Decimal(0.5) },
        { threshold: new Decimal(6300000), rate: new Decimal(0.75) },
        { threshold: new Decimal(6750000), rate: new Decimal(1) },
        { threshold: new Decimal(7500000), rate: new Decimal(1.25) },
        { threshold: new Decimal(8550000), rate: new Decimal(1.5) },
        { threshold: new Decimal(9650000), rate: new Decimal(1.75) },
        { threshold: new Decimal(10050000), rate: new Decimal(2) },
        { threshold: new Decimal(10350000), rate: new Decimal(2.25) },
        { threshold: new Decimal(10700000), rate: new Decimal(2.5) },
        { threshold: new Decimal(11050000), rate: new Decimal(3) },
        { threshold: new Decimal(11600000), rate: new Decimal(3.5) },
        { threshold: new Decimal(12500000), rate: new Decimal(4) },
        { threshold: new Decimal(14200000), rate: new Decimal(5) },
        { threshold: new Decimal(16950000), rate: new Decimal(6) },
        { threshold: new Decimal(19750000), rate: new Decimal(7) },
        { threshold: new Decimal(24150000), rate: new Decimal(8) },
        { threshold: new Decimal(26450000), rate: new Decimal(9) },
        { threshold: new Decimal(28000000), rate: new Decimal(10) },
        { threshold: new Decimal(30050000), rate: new Decimal(11) },
        { threshold: new Decimal(32400000), rate: new Decimal(12) },
        { threshold: new Decimal(35400000), rate: new Decimal(13) },
        { threshold: new Decimal(39100000), rate: new Decimal(14) },
        { threshold: new Decimal(45400000), rate: new Decimal(15) },
        { threshold: new Decimal(53900000), rate: new Decimal(16) },
        { threshold: new Decimal(63900000), rate: new Decimal(17) },
        { threshold: new Decimal(75900000), rate: new Decimal(18) },
        { threshold: new Decimal(91400000), rate: new Decimal(19) },
        { threshold: new Decimal(107000000), rate: new Decimal(20) },
        { threshold: new Decimal(121500000), rate: new Decimal(21) },
        { threshold: new Decimal(141000000), rate: new Decimal(22) },
        { threshold: new Decimal(169000000), rate: new Decimal(23) },
        { threshold: new Decimal(221500000), rate: new Decimal(24) },
        { threshold: new Decimal(264500000), rate: new Decimal(25) },
        { threshold: new Decimal(319000000), rate: new Decimal(26) },
        { threshold: new Decimal(391000000), rate: new Decimal(27) },
        { threshold: new Decimal(506500000), rate: new Decimal(28) },
        { threshold: new Decimal(639000000), rate: new Decimal(29) },
        { threshold: new Decimal(999999999999), rate: new Decimal(30) },
      ],
      [TerCategory.B]: [
        { threshold: new Decimal(6200000), rate: new Decimal(0) },
        { threshold: new Decimal(6500000), rate: new Decimal(0.25) },
        { threshold: new Decimal(6850000), rate: new Decimal(0.5) },
        { threshold: new Decimal(7300000), rate: new Decimal(0.75) },
        { threshold: new Decimal(9200000), rate: new Decimal(1) },
        { threshold: new Decimal(10750000), rate: new Decimal(1.25) },
        { threshold: new Decimal(11250000), rate: new Decimal(1.5) },
        { threshold: new Decimal(11600000), rate: new Decimal(1.75) },
        { threshold: new Decimal(12650000), rate: new Decimal(2) },
        { threshold: new Decimal(13750000), rate: new Decimal(3) },
        { threshold: new Decimal(15150000), rate: new Decimal(4) },
        { threshold: new Decimal(16950000), rate: new Decimal(5) },
        { threshold: new Decimal(19750000), rate: new Decimal(6) },
        { threshold: new Decimal(24150000), rate: new Decimal(7) },
        { threshold: new Decimal(26450000), rate: new Decimal(8) },
        { threshold: new Decimal(28000000), rate: new Decimal(9) },
        { threshold: new Decimal(30050000), rate: new Decimal(10) },
        { threshold: new Decimal(32400000), rate: new Decimal(11) },
        { threshold: new Decimal(35400000), rate: new Decimal(12) },
        { threshold: new Decimal(39100000), rate: new Decimal(13) },
        { threshold: new Decimal(45400000), rate: new Decimal(14) },
        { threshold: new Decimal(53900000), rate: new Decimal(15) },
        { threshold: new Decimal(63900000), rate: new Decimal(16) },
        { threshold: new Decimal(75900000), rate: new Decimal(17) },
        { threshold: new Decimal(91400000), rate: new Decimal(18) },
        { threshold: new Decimal(107000000), rate: new Decimal(19) },
        { threshold: new Decimal(121500000), rate: new Decimal(20) },
        { threshold: new Decimal(141000000), rate: new Decimal(21) },
        { threshold: new Decimal(169000000), rate: new Decimal(22) },
        { threshold: new Decimal(221500000), rate: new Decimal(23) },
        { threshold: new Decimal(264500000), rate: new Decimal(24) },
        { threshold: new Decimal(319000000), rate: new Decimal(25) },
        { threshold: new Decimal(391000000), rate: new Decimal(26) },
        { threshold: new Decimal(506500000), rate: new Decimal(27) },
        { threshold: new Decimal(639000000), rate: new Decimal(28) },
        { threshold: new Decimal(999999999999), rate: new Decimal(29) },
      ],
      [TerCategory.C]: [
        { threshold: new Decimal(6600000), rate: new Decimal(0) },
        { threshold: new Decimal(6950000), rate: new Decimal(0.25) },
        { threshold: new Decimal(7350000), rate: new Decimal(0.5) },
        { threshold: new Decimal(7800000), rate: new Decimal(0.75) },
        { threshold: new Decimal(8850000), rate: new Decimal(1) },
        { threshold: new Decimal(9800000), rate: new Decimal(1.25) },
        { threshold: new Decimal(10750000), rate: new Decimal(1.5) },
        { threshold: new Decimal(11250000), rate: new Decimal(1.75) },
        { threshold: new Decimal(11650000), rate: new Decimal(2) },
        { threshold: new Decimal(12650000), rate: new Decimal(2.25) },
        { threshold: new Decimal(13750000), rate: new Decimal(2.5) },
        { threshold: new Decimal(15150000), rate: new Decimal(3) },
        { threshold: new Decimal(16950000), rate: new Decimal(4) },
        { threshold: new Decimal(19750000), rate: new Decimal(5) },
        { threshold: new Decimal(24150000), rate: new Decimal(6) },
        { threshold: new Decimal(26450000), rate: new Decimal(7) },
        { threshold: new Decimal(28000000), rate: new Decimal(8) },
        { threshold: new Decimal(30050000), rate: new Decimal(9) },
        { threshold: new Decimal(32400000), rate: new Decimal(10) },
        { threshold: new Decimal(35400000), rate: new Decimal(11) },
        { threshold: new Decimal(39100000), rate: new Decimal(12) },
        { threshold: new Decimal(45400000), rate: new Decimal(13) },
        { threshold: new Decimal(53900000), rate: new Decimal(14) },
        { threshold: new Decimal(63900000), rate: new Decimal(15) },
        { threshold: new Decimal(75900000), rate: new Decimal(16) },
        { threshold: new Decimal(91400000), rate: new Decimal(17) },
        { threshold: new Decimal(107000000), rate: new Decimal(18) },
        { threshold: new Decimal(121500000), rate: new Decimal(19) },
        { threshold: new Decimal(141000000), rate: new Decimal(20) },
        { threshold: new Decimal(169000000), rate: new Decimal(21) },
        { threshold: new Decimal(221500000), rate: new Decimal(22) },
        { threshold: new Decimal(264500000), rate: new Decimal(23) },
        { threshold: new Decimal(319000000), rate: new Decimal(24) },
        { threshold: new Decimal(391000000), rate: new Decimal(25) },
        { threshold: new Decimal(506500000), rate: new Decimal(26) },
        { threshold: new Decimal(639000000), rate: new Decimal(27) },
        { threshold: new Decimal(999999999999), rate: new Decimal(28) },
      ],
    };

    const rates = monthlyRates[terCategory];
    let applicableRate = new Decimal(0);
    
    for (const bracket of rates) {
      if (grossIncome.lessThanOrEqualTo(bracket.threshold)) {
        applicableRate = bracket.rate;
        break;
      }
    }

    const taxAmount = grossIncome.times(applicableRate.dividedBy(100));
    
    return {
      taxBase: grossIncome,
      taxRate: applicableRate,
      taxAmount: taxAmount.toDecimalPlaces(0),
    };
  }

  // PPh 23 Calculator (2% of gross amount for services)
  public static calculatePph23(grossAmount: Decimal): { taxBase: Decimal; taxRate: Decimal; taxAmount: Decimal } {
    const rate = new Decimal(2);
    return {
      taxBase: grossAmount,
      taxRate: rate,
      taxAmount: grossAmount.times(rate.dividedBy(100)).toDecimalPlaces(0),
    };
  }

  // PPh 4(2) Calculator (10% for rent, final)
  public static calculatePph4Ayat2(grossAmount: Decimal, rate: Decimal = new Decimal(10)): { taxBase: Decimal; taxRate: Decimal; taxAmount: Decimal } {
    return {
      taxBase: grossAmount,
      taxRate: rate,
      taxAmount: grossAmount.times(rate.dividedBy(100)).toDecimalPlaces(0),
    };
  }
}
