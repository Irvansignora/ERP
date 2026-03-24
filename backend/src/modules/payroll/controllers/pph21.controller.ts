import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Pph21Service, Pph21CalculationDto, Pph21CalculationResult } from '../services/pph21.service';

@ApiTags('Payroll - PPh 21')
@Controller('pph21')
export class Pph21Controller {
  constructor(private readonly pph21Service: Pph21Service) {}

  @Post('calculate-monthly')
  @ApiOperation({ summary: 'Calculate monthly PPh 21 using TER' })
  @ApiResponse({ status: 200, description: 'PPh 21 calculated successfully' })
  async calculateMonthly(@Body() dto: Pph21CalculationDto): Promise<Pph21CalculationResult> {
    return this.pph21Service.calculateMonthly(dto);
  }

  @Get('calculate-year-end/:employeeId')
  @ApiOperation({ summary: 'Calculate year-end PPh 21 (realization)' })
  @ApiQuery({ name: 'taxYear', required: true, type: Number })
  async calculateYearEnd(
    @Param('employeeId') employeeId: string,
    @Query('taxYear') taxYear: string,
  ): Promise<Pph21CalculationResult> {
    return this.pph21Service.calculateYearEnd(employeeId, parseInt(taxYear, 10));
  }

  @Get('ter-rates')
  @ApiOperation({ summary: 'Get TER rates for all categories' })
  @ApiResponse({ status: 200, description: 'TER rates retrieved successfully' })
  async getTerRates() {
    return this.pph21Service.getTerRates();
  }
}
