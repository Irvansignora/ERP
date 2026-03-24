import { Decimal } from 'decimal.js';

export enum PartnerType {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  BOTH = 'BOTH',
}

export enum PartnerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export enum TaxStatus {
  PKP = 'PKP',
  NON_PKP = 'NON_PKP',
}

export enum PtkpStatus {
  TK_0 = 'TK_0',
  K_0 = 'K_0',
  K_1 = 'K_1',
  K_2 = 'K_2',
  K_3 = 'K_3',
  TK_1 = 'TK_1',
  TK_2 = 'TK_2',
  TK_3 = 'TK_3',
}

export enum TerCategory {
  A = 'A',
  B = 'B',
  C = 'C',
}

export interface PartnerProps {
  id: string;
  code: string;
  name: string;
  type: PartnerType;
  status: PartnerStatus;
  
  // Tax Identity
  npwp15?: string;
  npwp16?: string;
  nitku?: string;
  nik?: string;
  passport?: string;
  
  // Tax Status
  taxStatus: TaxStatus;
  isPkp: boolean;
  pkpDate?: Date;
  
  // Contact
  address?: string;
  countryCode: string;
  province?: string;
  city?: string;
  district?: string;
  subDistrict?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  fax?: string;
  
  // Business
  businessType?: string;
  businessField?: string;
  
  // PPh 21
  ptkpStatus?: PtkpStatus;
  terCategory?: TerCategory;
  isEmployee: boolean;
  joinDate?: Date;
  
  // Bank
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted: boolean;
}

export class Partner {
  private readonly props: PartnerProps;

  constructor(props: PartnerProps) {
    this.props = props;
    this.validate();
  }

  private validate(): void {
    if (!this.props.code || this.props.code.length < 3) {
      throw new Error('Partner code must be at least 3 characters');
    }
    if (!this.props.name || this.props.name.length < 3) {
      throw new Error('Partner name must be at least 3 characters');
    }
    
    // Validate NPWP 16 format if provided
    if (this.props.npwp16 && !this.isValidNpwp16(this.props.npwp16)) {
      throw new Error('Invalid NPWP 16 format');
    }
    
    // Validate NIK if provided
    if (this.props.nik && !this.isValidNik(this.props.nik)) {
      throw new Error('Invalid NIK format');
    }
  }

  private isValidNpwp16(npwp: string): boolean {
    // NPWP 16 digits format: 2 digits + 4 digits + 4 digits + 2 digits + 4 digits
    const npwpRegex = /^\d{2}\d{4}\d{4}\d{2}\d{4}$/;
    return npwpRegex.test(npwp) && npwp.length === 16;
  }

  private isValidNik(nik: string): boolean {
    // NIK is 16 digits
    const nikRegex = /^\d{16}$/;
    return nikRegex.test(nik);
  }

  // Getters
  get id(): string { return this.props.id; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get type(): PartnerType { return this.props.type; }
  get status(): PartnerStatus { return this.props.status; }
  get npwp16(): string | undefined { return this.props.npwp16; }
  get nitku(): string | undefined { return this.props.nitku; }
  get nik(): string | undefined { return this.props.nik; }
  get taxStatus(): TaxStatus { return this.props.taxStatus; }
  get isPkp(): boolean { return this.props.isPkp; }
  get address(): string | undefined { return this.props.address; }
  get countryCode(): string { return this.props.countryCode; }
  get email(): string | undefined { return this.props.email; }
  get phone(): string | undefined { return this.props.phone; }
  get ptkpStatus(): PtkpStatus | undefined { return this.props.ptkpStatus; }
  get terCategory(): TerCategory | undefined { return this.props.terCategory; }
  get isEmployee(): boolean { return this.props.isEmployee; }
  get isDeleted(): boolean { return this.props.isDeleted; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business methods
  public updateName(name: string): void {
    if (!name || name.length < 3) {
      throw new Error('Partner name must be at least 3 characters');
    }
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  public updateAddress(address: string): void {
    this.props.address = address;
    this.props.updatedAt = new Date();
  }

  public updateNpwp16(npwp16: string): void {
    if (!this.isValidNpwp16(npwp16)) {
      throw new Error('Invalid NPWP 16 format');
    }
    this.props.npwp16 = npwp16;
    this.props.updatedAt = new Date();
  }

  public updateNik(nik: string): void {
    if (!this.isValidNik(nik)) {
      throw new Error('Invalid NIK format');
    }
    this.props.nik = nik;
    this.props.updatedAt = new Date();
  }

  public setPkpStatus(isPkp: boolean, pkpDate?: Date): void {
    this.props.isPkp = isPkp;
    this.props.taxStatus = isPkp ? TaxStatus.PKP : TaxStatus.NON_PKP;
    if (isPkp && pkpDate) {
      this.props.pkpDate = pkpDate;
    }
    this.props.updatedAt = new Date();
  }

  public setTerCategory(category: TerCategory): void {
    if (!this.props.isEmployee) {
      throw new Error('Only employees can have TER category');
    }
    this.props.terCategory = category;
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    this.props.status = PartnerStatus.INACTIVE;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.status = PartnerStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  public softDelete(deletedBy: string): void {
    this.props.isDeleted = true;
    this.props.status = PartnerStatus.INACTIVE;
    this.props.updatedAt = new Date();
  }

  public toJSON(): PartnerProps {
    return { ...this.props };
  }

  // Static factory method
  public static create(props: Omit<PartnerProps, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Partner {
    return new Partner({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });
  }
}
