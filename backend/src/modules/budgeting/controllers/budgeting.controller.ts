import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BudgetingService } from '../services/budgeting.service';

@Controller('budgeting')
export class BudgetingController {
  constructor(private readonly budgetingService: BudgetingService) {}

  @Get()
  getAllBudgets(@Query('fiscalYear') fiscalYear: string) {
    return this.budgetingService.getAllBudgets(fiscalYear ? parseInt(fiscalYear) : undefined);
  }

  @Post()
  createBudget(@Body() body: any) {
    return this.budgetingService.createBudget(body);
  }

  @Post(':id/approve')
  approveBudget(@Param('id') id: string) {
    return this.budgetingService.approveBudget(id);
  }

  @Get(':id/vs-actual')
  getBudgetVsActual(@Param('id') id: string) {
    return this.budgetingService.getBudgetVsActual(id);
  }
}
