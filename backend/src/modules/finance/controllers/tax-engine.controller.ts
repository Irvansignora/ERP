import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TaxEngineService, TaxSummary, ValidationReport } from '../services/tax-engine.service';

@ApiTags('Finance - Tax Engine')
@Controller('tax-engine')
export class TaxEngineController {
  constructor(private readonly taxEngineService: TaxEngineService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get tax summary for a period' })
  @ApiQuery({ name: 'period', required: true, description: 'Format: YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Tax summary retrieved successfully' })
  async getTaxSummary(@Query('period') period: string): Promise<TaxSummary> {
    return this.taxEngineService.getTaxSummary(period);
  }

  @Post('pre-validation')
  @ApiOperation({ summary: 'Run pre-validation for a period' })
  @ApiQuery({ name: 'period', required: true, description: 'Format: YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Pre-validation completed' })
  async runPreValidation(@Query('period') period: string): Promise<ValidationReport[]> {
    return this.taxEngineService.runPreValidation(period);
  }

  @Get('xml-history')
  @ApiOperation({ summary: 'Get XML generation history' })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getXmlGenerationHistory(
    @Query('documentType') documentType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.taxEngineService.getXmlGenerationHistory(
      documentType,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('tax-mapping')
  @ApiOperation({ summary: 'Get tax mapping configuration' })
  async getTaxMapping() {
    return this.taxEngineService.getTaxMapping();
  }
}
