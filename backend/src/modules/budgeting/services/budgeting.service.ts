import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BudgetStatus } from '@prisma/client';

@Injectable()
export class BudgetingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBudget(dto: {
    name: string;
    description?: string;
    fiscalYear: number;
    lines: Array<{ accountId: string; month: number; plannedAmount: number; notes?: string }>;
    userId?: string;
  }) {
    return this.prisma.budget.create({
      data: {
        name: dto.name,
        description: dto.description,
        fiscalYear: dto.fiscalYear,
        createdBy: dto.userId,
        lines: { create: dto.lines },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async getAllBudgets(fiscalYear?: number) {
    return this.prisma.budget.findMany({
      where: fiscalYear ? { fiscalYear } : {},
      include: { _count: { select: { lines: true } } },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  async approveBudget(id: string) {
    return this.prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.APPROVED },
    });
  }

  async getBudgetVsActual(budgetId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      include: { lines: { include: { account: true } } },
    });
    if (!budget) return null;

    // Get actual journal amounts per account per month
    const results = await Promise.all(
      budget.lines.map(async (line) => {
        const journalLines = await this.prisma.journalLine.findMany({
          where: {
            accountId: line.accountId,
            journalEntry: {
              year: budget.fiscalYear,
              month: line.month,
              status: 'POSTED',
            },
          },
        });
        const actualDebit = journalLines.reduce((s, l) => s + Number(l.debit), 0);
        const actualCredit = journalLines.reduce((s, l) => s + Number(l.credit), 0);
        const actual = actualDebit - actualCredit;
        return {
          accountId: line.accountId,
          accountName: line.account.name,
          month: line.month,
          planned: Number(line.plannedAmount),
          actual,
          variance: Number(line.plannedAmount) - actual,
          variancePct: Number(line.plannedAmount) > 0
            ? ((Number(line.plannedAmount) - actual) / Number(line.plannedAmount)) * 100
            : 0,
        };
      }),
    );
    return { budget, lines: results };
  }
}
