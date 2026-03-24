import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Account, AccountType } from '@prisma/client';

export interface CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  taxObjectCode?: string;
  isTaxAccount?: boolean;
  taxType?: string;
  isBankAccount?: boolean;
  currency?: string;
  openingBalance?: number;
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto): Promise<Account> {
    return this.prisma.account.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        taxObjectCode: dto.taxObjectCode,
        isTaxAccount: dto.isTaxAccount || false,
        taxType: dto.taxType,
        isBankAccount: dto.isBankAccount || false,
        currency: dto.currency || 'IDR',
        openingBalance: dto.openingBalance || 0,
      },
    });
  }

  async findAll(): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findById(id: string): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async findByCode(code: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { code },
    });
  }

  async getTaxAccounts(): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: {
        isTaxAccount: true,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }
}
