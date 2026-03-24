import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { TaxInvoiceService, CreateTaxInvoiceDto, TaxInvoiceFilter } from '../services/tax-invoice.service';
import { TaxInvoice } from '@domain/entities/tax-invoice.entity';
import { CurrentUser, AuthUser } from '@modules/auth/decorators/current-user.decorator';

@ApiBearerAuth('JWT')
@ApiTags('Sales - Tax Invoices')
@Controller('tax-invoices')
export class TaxInvoiceController {
  constructor(private readonly taxInvoiceService: TaxInvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tax invoice' })
  @ApiResponse({ status: 201, description: 'Tax invoice created successfully', type: TaxInvoice })
  // FIX (Bug #2): Extract userId from JWT instead of hardcoding 'system'
  async create(
    @Body() dto: CreateTaxInvoiceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TaxInvoice> {
    return this.taxInvoiceService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tax invoices with filtering' })
  @ApiQuery({ name: 'taxPeriod', required: false, type: String })
  @ApiQuery({ name: 'buyerId', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiQuery({ name: 'xmlGenerated', required: false, type: Boolean })
  @ApiQuery({ name: 'approvalStatus', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('taxPeriod') taxPeriod?: string,
    @Query('buyerId') buyerId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('xmlGenerated') xmlGenerated?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: TaxInvoice[]; total: number; page: number; limit: number }> {
    const filter: TaxInvoiceFilter = {
      taxPeriod,
      buyerId,
      sellerId,
      xmlGenerated: xmlGenerated !== undefined ? xmlGenerated === 'true' : undefined,
      approvalStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.taxInvoiceService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax invoice by ID' })
  @ApiResponse({ status: 200, description: 'Tax invoice found', type: TaxInvoice })
  @ApiResponse({ status: 404, description: 'Tax invoice not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<TaxInvoice> {
    return this.taxInvoiceService.findById(id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate tax invoice for XML export' })
  async validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxInvoiceService.validateForExport(id);
  }

  @Post(':id/generate-xml')
  @ApiOperation({ summary: 'Generate XML for tax invoice' })
  async generateXml(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const result = await this.taxInvoiceService.generateXml(id, user.id);
    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }

  @Post('bulk-generate-xml')
  @ApiOperation({ summary: 'Generate XML for multiple tax invoices' })
  async generateBulkXml(
    @Body('ids') ids: string[],
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const result = await this.taxInvoiceService.generateBulkXml(ids, user.id);
    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }
}
