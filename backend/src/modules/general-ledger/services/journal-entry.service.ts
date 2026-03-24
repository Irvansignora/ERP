import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { JournalEntry, JournalStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

export interface JournalLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  projectCode?: string;
}

export interface CreateJournalEntryDto {
  entryDate: Date;
  referenceType?: string;
  referenceId?: string;
  description: string;
  memo?: string;
  lines: JournalLineDto[];
}

@Injectable()
export class JournalEntryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJournalEntryDto, userId: string): Promise<JournalEntry> {
    // Validate that debits equal credits
    const totalDebit = dto.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Total debits must equal total credits');
    }

    if (dto.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    // Generate entry number
    const entryDate = new Date(dto.entryDate);
    const year = entryDate.getFullYear();
    const month = (entryDate.getMonth() + 1).toString().padStart(2, '0');
    
    const count = await this.prisma.journalEntry.count({
      where: {
        year,
        month: entryDate.getMonth() + 1,
      },
    });

    const entryNumber = `JV-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;

    const entry = await this.prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate,
        period: `${month}-${year}`,
        year,
        month: entryDate.getMonth() + 1,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        description: dto.description,
        memo: dto.memo,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        status: JournalStatus.DRAFT,
        createdBy: userId,
        lines: {
          create: dto.lines.map((line, index) => ({
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
            costCenter: line.costCenter,
            projectCode: line.projectCode,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    return entry;
  }

  async findAll(params: { period?: string; status?: JournalStatus; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.period) {
      where.period = params.period;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { entryDate: 'desc' },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<JournalEntry> {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    return entry;
  }

  async post(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.findById(id);

    if (entry.status !== JournalStatus.DRAFT) {
      throw new BadRequestException('Only draft entries can be posted');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalStatus.POSTED,
        postedBy: userId,
        postedAt: new Date(),
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  async reverse(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.findById(id);

    if (entry.status !== JournalStatus.POSTED) {
      throw new BadRequestException('Only posted entries can be reversed');
    }

    // Create reversal entry
    const reversalLines = entry.lines.map((line) => ({
      accountId: line.accountId,
      debit: Number(line.credit),
      credit: Number(line.debit),
      description: `Reversal of ${entry.entryNumber}`,
    }));

    const reversalEntry = await this.create({
      entryDate: new Date(),
      referenceType: 'REVERSAL',
      referenceId: entry.id,
      description: `Reversal of Journal Entry ${entry.entryNumber}`,
      lines: reversalLines,
    }, userId);

    // Mark original as reversed
    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        isReversal: true,
      },
    });

    return reversalEntry;
  }
}
