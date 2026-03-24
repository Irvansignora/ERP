# CoreTax ERP Backend

Enterprise Resource Planning (ERP) System with Indonesian CoreTax (CTAS) XML Integration.

## Features

### 1. Master Data Module
- **Partner Management**: Customers, Vendors, Employees
  - NPWP 16 digit validation
  - NIK validation
  - NITKU (22 digits) support
  - PKP/Non-PKP status tracking
  - TER Category (A/B/C) for employees

- **Product & Services Management**
  - Tax Object Code mapping
  - UOM (Unit of Measure) configuration
  - VAT and PPh rate settings

### 2. Sales Module (Pajak Keluaran)
- Tax Invoice management
- Auto-calculation of DPP, PPN, PPnBM
- Tax-inclusive and Tax-exclusive pricing
- Credit/Debit Note support
- CoreTax XML export for VAT Out

### 3. Purchase Module (Pajak Masukan & PPh)
- VAT In tracking
- Withholding Tax (PPh 23, PPh 4(2), etc.)
- Bupot Unifikasi management
- Vendor invoice tracking

### 4. Payroll Module (PPh 21 TER)
- TER (Tarif Efektif Rata-rata) calculation
- Monthly PPh 21 calculator
- Year-end realization (Desember)
- PPh 21 XML export

### 5. Finance & Tax Engine
- Tax Summary Dashboard
- Pre-validation before XML export
- SPT Simulator
- XML Generation History
- Tax Mapping Center

### 6. General Ledger
- Double-entry accounting
- Chart of Accounts management
- Journal Entry posting
- Automatic tax journal generation

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Architecture**: Domain-Driven Design (DDD)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **XML Generation**: xmlbuilder2
- **Financial Calculations**: decimal.js

## Project Structure

```
src/
├── domain/              # Domain layer (entities, value objects)
│   ├── entities/        # Domain entities
│   ├── repositories/    # Repository interfaces
│   ├── services/        # Domain services
│   └── value-objects/   # Value objects
├── application/         # Application layer (use cases)
│   ├── commands/        # CQRS commands
│   ├── queries/         # CQRS queries
│   ├── services/        # Application services
│   └── dtos/            # Data Transfer Objects
├── infrastructure/      # Infrastructure layer
│   ├── database/        # Database configuration
│   ├── http/            # HTTP clients
│   ├── xml/             # XML generators
│   └── validators/      # Validators
├── presentation/        # Presentation layer
│   └── controllers/     # API controllers
├── modules/             # Feature modules
│   ├── master-data/     # Master data module
│   ├── sales/           # Sales module
│   ├── purchase/        # Purchase module
│   ├── payroll/         # Payroll module
│   ├── finance/         # Finance module
│   ├── general-ledger/  # GL module
│   └── tax-engine/      # Tax engine module
└── shared/              # Shared utilities
```

## Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run start:dev
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/coretax_erp?schema=public"

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api
API_VERSION=v1

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# CoreTax
CORETAX_TIN=0202338927031000
CORETAX_NITKU=0202338927031000000000
```

## API Documentation

Once the server is running, API documentation is available at:
- Swagger UI: `http://localhost:3000/api/docs`

## XML Export Formats

### VAT Out (Pajak Keluaran)
- Format: TaxInvoiceBulk
- Schema: TaxInvoice.xsd
- Fields: TIN, TaxInvoiceDate, BuyerTin, TaxObjectCode, etc.

### PPh 21
- Format: PPh21Bulk
- Schema: PPh21.xsd
- Fields: SubjectTin, TerCategory, TaxAmount, etc.

### PPh Unifikasi
- Format: BuktiPotongUnifikasiBulk
- Schema: BuktiPotongUnifikasi.xsd
- Fields: NITKU, KodeObjekPajak, JumlahPphDipotong, etc.

## Validation Rules

### NPWP 16 Digits
- Format: 9999999999999999 (16 digits)
- Structure: 2 (tax office) + 4 + 4 + 2 + 4

### NIK
- Format: 9999999999999999 (16 digits)
- Structure: 2 (province) + 2 (city) + 2 (district) + 6 (date) + 4 (sequence)

### NITKU
- Format: 9999999999999999999999 (22 digits)
- Structure: 16 (NPWP) + 6 (branch code)

## Scripts

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Database
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio

# Testing
npm run test
npm run test:e2e
```

## License

MIT
