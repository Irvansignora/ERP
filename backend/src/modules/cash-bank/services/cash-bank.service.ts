import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class CashBankService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Bank Statements ──────────────────────────────────────
  async importBankStatement(entries: Array<{
    accountId: string;
    statementDate: Date;
    referenceNumber?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>) {
    return this.prisma.bankStatement.createMany({ data: entries, skipDuplicates: true });
  }

  async getUnreconciled(accountId: string) {
    return this.prisma.bankStatement.findMany({
      where: { accountId, isReconciled: false },
      orderBy: { statementDate: 'asc' },
    });
  }

  async reconcileStatement(id: string, journalEntryId: string) {
    return this.prisma.bankStatement.update({
      where: { id },
      data: { isReconciled: true, reconciledAt: new Date(), journalEntryId },
    });
  }

  async getBankBalance(accountId: string) {
    const latest = await this.prisma.bankStatement.findFirst({
      where: { accountId },
      orderBy: { statementDate: 'desc' },
    });
    return { accountId, balance: latest?.balance ?? 0, lastUpdated: latest?.statementDate };
  }

  // ── Payments ─────────────────────────────────────────────
  async createPayment(dto: {
    paymentType: string;
    paymentDate: Date;
    method: string;
    partnerId: string;
    accountId: string;
    amount: number;
    referenceNumber?: string;
    notes?: string;
    userId?: string;
  }) {
    const count = await this.prisma.payment.count();
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          paymentDate: dto.paymentDate,
          paymentType: dto.paymentType,
          method: dto.method,
          partnerId: dto.partnerId,
          accountId: dto.accountId,
          amount: dto.amount,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          createdBy: dto.userId,
        },
        include: { partner: true, account: true },
      });

      // Auto-create journal entry
      const isIncoming = dto.paymentType === 'INCOMING';
      const count2 = await tx.journalEntry.count();
      const entryNumber = `JE-${new Date().getFullYear()}-${String(count2 + 1).padStart(6, '0')}`;
      const entryDate = dto.paymentDate;
      const period = `${String(entryDate.getMonth() + 1).padStart(2, '0')}-${entryDate.getFullYear()}`;

      await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate,
          period,
          year: entryDate.getFullYear(),
          month: entryDate.getMonth() + 1,
          description: `Payment ${paymentNumber} - ${dto.paymentType}`,
          status: 'POSTED',
          totalDebit: dto.amount,
          totalCredit: dto.amount,
          partnerId: dto.partnerId,
          lines: {
            create: [
              {
                lineNumber: 1,
                accountId: dto.accountId,
                debit: isIncoming ? dto.amount : 0,
                credit: isIncoming ? 0 : dto.amount,
                description: `Payment ${paymentNumber}`,
              },
              {
                lineNumber: 2,
                accountId: dto.accountId, // Should be AR/AP account ideally
                debit: isIncoming ? 0 : dto.amount,
                credit: isIncoming ? dto.amount : 0,
                description: `Offset ${paymentNumber}`,
              },
            ],
          },
        },
      });

      return payment;
    });
  }

  async getAllPayments(params: { paymentType?: string; partnerId?: string; limit?: number }) {
    return this.prisma.payment.findMany({
      where: {
        ...(params.paymentType && { paymentType: params.paymentType }),
        ...(params.partnerId && { partnerId: params.partnerId }),
      },
      include: { partner: true, account: true },
      orderBy: { paymentDate: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async getCashflowSummary(period: string) {
    const [month, year] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const payments = await this.prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end }, status: PaymentStatus.COMPLETED },
    });

    const incoming = payments
      .filter((p) => p.paymentType === 'INCOMING')
      .reduce((s, p) => s + Number(p.amount), 0);
    const outgoing = payments
      .filter((p) => p.paymentType === 'OUTGOING')
      .reduce((s, p) => s + Number(p.amount), 0);

    return { period, totalIncoming: incoming, totalOutgoing: outgoing, netCashflow: incoming - outgoing };
  }
}
