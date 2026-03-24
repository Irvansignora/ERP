import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { WithholdingSlip, TerCategory } from '@domain/entities/withholding-slip.entity';
import { Decimal } from 'decimal.js';

export interface Pph21CalculationDto {
  employeeId: string;
  grossIncome: number;
  taxYear: number;
  taxMonth: number;
  isDecember: boolean;
}

export interface Pph21CalculationResult {
  employeeId: string;
  employeeName: string;
  terCategory: TerCategory;
  grossIncome: Decimal;
  taxBase: Decimal;
  terRate: Decimal;
  monthlyTax: Decimal;
  yearlyTax?: Decimal;
  taxDifference?: Decimal;
}

export interface TerBracket {
  threshold: Decimal;
  rate: Decimal;
}

@Injectable()
export class Pph21Service {
  private readonly logger = new Logger(Pph21Service.name);

  // TER rates based on PP 58/2023
  private readonly terRates: Record<TerCategory, TerBracket[]> = {
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

  constructor(private readonly prisma: PrismaService) {}

  async calculateMonthly(dto: Pph21CalculationDto): Promise<Pph21CalculationResult> {
    const employee = await this.prisma.partner.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee || !employee.isEmployee) {
      throw new Error('Employee not found');
    }

    if (!employee.terCategory) {
      throw new Error('Employee does not have TER category assigned');
    }

    const grossIncome = new Decimal(dto.grossIncome);
    const terCategory = employee.terCategory as TerCategory;

    // Calculate TER
    const calculated = this.calculateTer(grossIncome, terCategory);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      terCategory,
      grossIncome,
      taxBase: calculated.taxBase,
      terRate: calculated.taxRate,
      monthlyTax: calculated.taxAmount,
    };
  }

  async calculateYearEnd(employeeId: string, taxYear: number): Promise<Pph21CalculationResult> {
    // Get all PPh 21 slips for the year
    const slips = await this.prisma.withholdingSlip.findMany({
      where: {
        subjectId: employeeId,
        slipType: 'PPH_21',
        taxYear,
      },
    });

    const employee = await this.prisma.partner.findUnique({
      where: { id: employeeId },
    });

    if (!employee || !employee.isEmployee) {
      throw new Error('Employee not found');
    }

    // Calculate total gross income for the year
    const totalGrossIncome = slips.reduce(
      (sum, slip) => sum.plus(slip.incomeAmount),
      new Decimal(0),
    );

    // Calculate total tax paid
    const totalTaxPaid = slips.reduce(
      (sum, slip) => sum.plus(slip.taxAmount),
      new Decimal(0),
    );

    // Calculate yearly tax using progressive rates (simplified)
    // In real implementation, this should use the actual PPh 21 calculation
    const yearlyTax = this.calculateYearlyTax(totalGrossIncome, employee.ptkpStatus as any);

    // Calculate difference
    const taxDifference = yearlyTax.minus(totalTaxPaid);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      terCategory: employee.terCategory as TerCategory,
      grossIncome: totalGrossIncome,
      taxBase: totalGrossIncome,
      terRate: new Decimal(0),
      monthlyTax: totalTaxPaid,
      yearlyTax,
      taxDifference,
    };
  }

  private calculateTer(grossIncome: Decimal, category: TerCategory): { taxBase: Decimal; taxRate: Decimal; taxAmount: Decimal } {
    const rates = this.terRates[category];
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

  private calculateYearlyTax(grossIncome: Decimal, ptkpStatus: any): Decimal {
    // Simplified yearly tax calculation
    // In real implementation, this should follow the actual PPh 21 progressive rates
    // after deducting PTKP and employment expenses
    
    // PTKP amounts (2024)
    const ptkpAmounts: Record<string, Decimal> = {
      'TK_0': new Decimal(54000000),
      'K_0': new Decimal(58500000),
      'K_1': new Decimal(63000000),
      'K_2': new Decimal(67500000),
      'K_3': new Decimal(72000000),
    };

    const ptkp = ptkpAmounts[ptkpStatus] || ptkpAmounts['TK_0'];
    
    // Employment expense (5% of gross, max 6 million)
    const employmentExpense = Decimal.min(
      grossIncome.times(0.05),
      new Decimal(6000000),
    );

    // Net income
    const netIncome = grossIncome.minus(employmentExpense);

    // Taxable income (PKP)
    const pkp = Decimal.max(netIncome.minus(ptkp), new Decimal(0));

    // Progressive tax calculation
    let tax = new Decimal(0);
    
    if (pkp.greaterThan(0)) {
      const brackets = [
        { limit: new Decimal(60000000), rate: new Decimal(5) },
        { limit: new Decimal(250000000), rate: new Decimal(15) },
        { limit: new Decimal(500000000), rate: new Decimal(25) },
        { limit: new Decimal(5000000000), rate: new Decimal(30) },
      ];

      let remainingPkp = pkp;
      let previousLimit = new Decimal(0);

      for (const bracket of brackets) {
        const taxableAtBracket = Decimal.min(remainingPkp, bracket.limit.minus(previousLimit));
        if (taxableAtBracket.greaterThan(0)) {
          tax = tax.plus(taxableAtBracket.times(bracket.rate.dividedBy(100)));
          remainingPkp = remainingPkp.minus(taxableAtBracket);
        }
        previousLimit = bracket.limit;
        if (remainingPkp.lessThanOrEqualTo(0)) break;
      }
    }

    return tax.toDecimalPlaces(0);
  }

  async getTerRates(): Promise<Record<TerCategory, TerBracket[]>> {
    return this.terRates;
  }
}
