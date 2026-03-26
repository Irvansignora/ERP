import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountService, CreateAccountDto } from '../services/account.service';
import { Account } from '@prisma/client';

@ApiTags('General Ledger - Accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  async create(@Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'List of accounts' })
  async findAll(): Promise<Account[]> {
    return this.accountService.findAll();
  }

  @Get('tax-accounts')
  @ApiOperation({ summary: 'Get all tax accounts' })
  async getTaxAccounts(): Promise<Account[]> {
    return this.accountService.getTaxAccounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Account> {
    return this.accountService.findById(id);
  }
}
