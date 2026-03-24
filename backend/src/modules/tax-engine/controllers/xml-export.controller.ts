import { Controller, Post, Body, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { XmlExportService, ExportOptions } from '../services/xml-export.service';

@ApiTags('Tax Engine - XML Export')
@Controller('xml-export')
export class XmlExportController {
  constructor(private readonly xmlExportService: XmlExportService) {}

  @Post('tax-invoices')
  @ApiOperation({ summary: 'Export tax invoices to XML' })
  @ApiQuery({ name: 'period', required: false, description: 'Format: YYYY-MM' })
  async exportTaxInvoices(
    @Body('ids') ids: string[],
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const options: ExportOptions = {
      ids,
      period,
      documentType: 'TAX_INVOICE',
    };

    const result = await this.xmlExportService.exportTaxInvoices(options);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }

  @Post('pph21')
  @ApiOperation({ summary: 'Export PPh 21 slips to XML' })
  @ApiQuery({ name: 'period', required: false, description: 'Format: YYYY-MM' })
  async exportPph21(
    @Body('ids') ids: string[],
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const options: ExportOptions = {
      ids,
      period,
      documentType: 'PPH_21',
    };

    const result = await this.xmlExportService.exportPph21(options);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }

  @Post('pph-unifikasi')
  @ApiOperation({ summary: 'Export PPh Unifikasi slips to XML' })
  @ApiQuery({ name: 'period', required: false, description: 'Format: YYYY-MM' })
  async exportPphUnifikasi(
    @Body('ids') ids: string[],
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const options: ExportOptions = {
      ids,
      period,
      documentType: 'PPH_UNIFIKASI',
    };

    const result = await this.xmlExportService.exportPphUnifikasi(options);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate documents before XML export' })
  async validateForExport(@Body() options: ExportOptions) {
    return this.xmlExportService.validateForExport(options);
  }
}
