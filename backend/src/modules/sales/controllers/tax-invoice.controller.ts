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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { TaxInvoiceService, CreateTaxInvoiceDto, TaxInvoiceFilter } from '../services/tax-invoice.service';
import { TaxInvoice } from '@domain/entities/tax-invoice.entity';

@ApiTags('Sales - Tax Invoices')
@Controller('tax-invoices')
export class TaxInvoiceController {
  constructor(private readonly taxInvoiceService: TaxInvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tax invoice' })
  @ApiResponse({ status: 201, description: 'Tax invoice created successfully', type: TaxInvoice })
  async create(@Body() dto: CreateTaxInvoiceDto): Promise<TaxInvoice> {
    const userId = 'system';
    return this.taxInvoiceService.create(dto, userId);
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
  @ApiResponse({ status: 200, description: 'XML generated successfully' })
  async generateXml(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const userId = 'system';
    const result = await this.taxInvoiceService.generateXml(id, userId);

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
    @Res() res: Response,
  ) {
    const userId = 'system';
    const result = await this.taxInvoiceService.generateBulkXml(ids, userId);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }
}
