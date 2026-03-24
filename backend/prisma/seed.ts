import { PrismaClient, AccountType, PartnerType, TaxStatus, ProductType, WithholdingType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@coretax-erp.com' },
    update: {},
    create: {
      email: 'admin@coretax-erp.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      isVerified: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator with full access',
      permissions: ['*'],
    },
  });

  const taxStaffRole = await prisma.role.upsert({
    where: { name: 'TAX_STAFF' },
    update: {},
    create: {
      name: 'TAX_STAFF',
      description: 'Tax Staff for managing tax documents',
      permissions: [
        'tax_invoice:read',
        'tax_invoice:create',
        'tax_invoice:update',
        'withholding:read',
        'withholding:create',
        'withholding:update',
        'partner:read',
        'partner:create',
        'report:read',
      ],
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: 'ACCOUNTANT' },
    update: {},
    create: {
      name: 'ACCOUNTANT',
      description: 'Accountant for GL and journal entries',
      permissions: [
        'journal:read',
        'journal:create',
        'journal:post',
        'account:read',
        'report:read',
        'report:export',
      ],
    },
  });
  console.log('✅ Roles created');

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
    },
  });

  // Create Chart of Accounts
  const accounts = [
    // Assets
    { code: '1-1000', name: 'Kas', type: AccountType.ASSET, isActive: true },
    { code: '1-1100', name: 'Bank', type: AccountType.ASSET, isActive: true, isBankAccount: true },
    { code: '1-1200', name: 'Piutang Usaha', type: AccountType.ASSET, isActive: true },
    { code: '1-1210', name: 'Piutang PPN', type: AccountType.ASSET, isActive: true, isTaxAccount: true, taxType: 'PPN' },
    { code: '1-1300', name: 'Persediaan', type: AccountType.ASSET, isActive: true },
    { code: '1-1400', name: 'Uang Muka', type: AccountType.ASSET, isActive: true },
    
    // Liabilities
    { code: '2-1000', name: 'Utang Usaha', type: AccountType.LIABILITY, isActive: true },
    { code: '2-1100', name: 'Utang PPN', type: AccountType.LIABILITY, isActive: true, isTaxAccount: true, taxType: 'PPN' },
    { code: '2-1200', name: 'Utang PPh 21', type: AccountType.LIABILITY, isActive: true, isTaxAccount: true, taxType: 'PPh 21' },
    { code: '2-1210', name: 'Utang PPh 23', type: AccountType.LIABILITY, isActive: true, isTaxAccount: true, taxType: 'PPh 23' },
    { code: '2-1220', name: 'Utang PPh 4(2)', type: AccountType.LIABILITY, isActive: true, isTaxAccount: true, taxType: 'PPh 4(2)' },
    { code: '2-1300', name: 'Utang Gaji', type: AccountType.LIABILITY, isActive: true },
    
    // Equity
    { code: '3-1000', name: 'Modal Disetor', type: AccountType.EQUITY, isActive: true },
    { code: '3-1100', name: 'Laba Ditahan', type: AccountType.EQUITY, isActive: true },
    
    // Revenue
    { code: '4-1000', name: 'Pendapatan Usaha', type: AccountType.REVENUE, isActive: true },
    { code: '4-1100', name: 'Pendapatan Jasa', type: AccountType.REVENUE, isActive: true },
    
    // Expenses
    { code: '5-1000', name: 'Beban Pokok Penjualan', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1100', name: 'Beban Gaji', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1200', name: 'Beban Sewa', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1300', name: 'Beban Listrik & Air', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1400', name: 'Beban Telepon & Internet', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1500', name: 'Beban Perjalanan Dinas', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1600', name: 'Beban Pemasaran', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1700', name: 'Beban Administrasi', type: AccountType.EXPENSE, isActive: true },
    { code: '5-1800', name: 'Beban Pajak', type: AccountType.EXPENSE, isActive: true },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }
  console.log('✅ Chart of Accounts created');

  // Create sample partners
  const sampleCustomer = await prisma.partner.upsert({
    where: { code: 'CUST-001' },
    update: {},
    create: {
      code: 'CUST-001',
      name: 'PT. Maju Jaya',
      type: PartnerType.CUSTOMER,
      status: PartnerStatus.ACTIVE,
      npwp16: '0018852632007000',
      nitku: '0018852632007000000000',
      taxStatus: TaxStatus.PKP,
      isPkp: true,
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      countryCode: 'IDN',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      postalCode: '12190',
      email: 'finance@majujaya.co.id',
      phone: '021-5551234',
    },
  });

  const sampleVendor = await prisma.partner.upsert({
    where: { code: 'VEND-001' },
    update: {},
    create: {
      code: 'VEND-001',
      name: 'PT. Sukses Abadi',
      type: PartnerType.VENDOR,
      status: PartnerStatus.ACTIVE,
      npwp16: '0023456789012000',
      nitku: '0023456789012000000000',
      taxStatus: TaxStatus.PKP,
      isPkp: true,
      address: 'Jl. Thamrin No. 456, Jakarta Pusat',
      countryCode: 'IDN',
      province: 'DKI Jakarta',
      city: 'Jakarta Pusat',
      postalCode: '10350',
      email: 'billing@suksesabadi.co.id',
      phone: '021-5555678',
    },
  });
  console.log('✅ Sample partners created');

  // Create sample products
  const sampleProduct = await prisma.product.upsert({
    where: { code: 'PROD-001' },
    update: {},
    create: {
      code: 'PROD-001',
      name: 'Jasa Konsultasi IT',
      description: 'Jasa konsultasi teknologi informasi',
      type: ProductType.SERVICES,
      taxObjectCode: '01-000-01',
      taxObjectName: 'Jasa Kena Pajak',
      isVatTaxable: true,
      vatRate: 12,
      pphType: WithholdingType.PPH_23,
      pphRate: 2,
      uomCode: 'UM.0030',
      uomName: 'Bulan',
      defaultPrice: 10000000,
    },
  });
  console.log('✅ Sample products created');

  // Create Tax Mappings
  const taxMappings = [
    {
      accountCode: '1-1210',
      accountName: 'Piutang PPN',
      taxType: 'PPN',
      taxObjectCode: '01-000-01',
      taxObjectName: 'PPN Keluaran',
      taxRate: 12,
      transactionType: 'SALES',
      debitAccountId: '1-1210',
      creditAccountId: '2-1100',
    },
    {
      accountCode: '2-1100',
      accountName: 'Utang PPN',
      taxType: 'PPN',
      taxObjectCode: '01-000-01',
      taxObjectName: 'PPN Masukan',
      taxRate: 12,
      transactionType: 'PURCHASE',
      debitAccountId: '1-1210',
      creditAccountId: '2-1100',
    },
    {
      accountCode: '2-1200',
      accountName: 'Utang PPh 21',
      taxType: 'PPh 21',
      taxObjectCode: '21-100-01',
      taxObjectName: 'Gaji/Pensiun/Tunjangan',
      taxRate: 5,
      transactionType: 'PAYROLL',
      debitAccountId: '5-1100',
      creditAccountId: '2-1200',
    },
    {
      accountCode: '2-1210',
      accountName: 'Utang PPh 23',
      taxType: 'PPh 23',
      taxObjectCode: '23-100-01',
      taxObjectName: 'Jasa',
      taxRate: 2,
      transactionType: 'PURCHASE',
      debitAccountId: '5-1200',
      creditAccountId: '2-1210',
    },
    {
      accountCode: '2-1220',
      accountName: 'Utang PPh 4(2)',
      taxType: 'PPh 4(2)',
      taxObjectCode: '42-100-01',
      taxObjectName: 'Sewa Tanah/Bangunan',
      taxRate: 10,
      transactionType: 'PURCHASE',
      debitAccountId: '5-1200',
      creditAccountId: '2-1220',
    },
  ];

  for (const mapping of taxMappings) {
    const debitAccount = await prisma.account.findUnique({ where: { code: mapping.debitAccountId } });
    const creditAccount = await prisma.account.findUnique({ where: { code: mapping.creditAccountId } });
    
    if (debitAccount && creditAccount) {
      await prisma.taxMapping.upsert({
        where: {
          id: `${mapping.taxType}-${mapping.taxObjectCode}`,
        },
        update: {},
        create: {
          accountId: debitAccount.id,
          accountCode: mapping.accountCode,
          accountName: mapping.accountName,
          taxType: mapping.taxType,
          taxObjectCode: mapping.taxObjectCode,
          taxObjectName: mapping.taxObjectName,
          taxRate: mapping.taxRate,
          transactionType: mapping.transactionType,
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
        },
      });
    }
  }
  console.log('✅ Tax mappings created');

  // Create Company Config
  await prisma.companyConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'PT. Contoh Perusahaan',
      companyTin: '0202338927031000',
      companyNitku: '0202338927031000000000',
      companyNik: '3175012345678901',
      address: 'Jl. Example No. 123',
      countryCode: 'IDN',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      postalCode: '12190',
      email: 'tax@company.co.id',
      phone: '021-5550000',
      isPkp: true,
      pkpDate: new Date('2020-01-01'),
      fiscalYearStart: 1,
      defaultVatRate: 12,
      coretaxEnvironment: 'sandbox',
    },
  });
  console.log('✅ Company config created');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
