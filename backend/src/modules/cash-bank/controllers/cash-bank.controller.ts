import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CashBankService } from '../services/cash-bank.service';

@Controller('cash-bank')
export class CashBankController {
  constructor(private readonly cashBankService: CashBankService) {}

  @Post('bank-statements/import')
  importBankStatement(@Body() body: any) { return this.cashBankService.importBankStatement(body.entries); }

  @Get('bank-statements/unreconciled/:accountId')
  getUnreconciled(@Param('accountId') accountId: string) { return this.cashBankService.getUnreconciled(accountId); }

  @Post('bank-statements/:id/reconcile')
  reconcileStatement(@Param('id') id: string, @Body() body: any) {
    return this.cashBankService.reconcileStatement(id, body.journalEntryId);
  }

  @Get('bank-balance/:accountId')
  getBankBalance(@Param('accountId') accountId: string) { return this.cashBankService.getBankBalance(accountId); }

  @Post('payments')
  createPayment(@Body() body: any) { return this.cashBankService.createPayment(body); }

  @Get('payments')
  getAllPayments(@Query() query: any) { return this.cashBankService.getAllPayments(query); }

  @Get('cashflow')
  getCashflowSummary(@Query('period') period: string) { return this.cashBankService.getCashflowSummary(period); }
}
