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
import { WithholdingSlipService, CreateWithholdingSlipDto, WithholdingSlipFilter } from '../services/withholding-slip.service';
import { WithholdingSlip } from '@domain/entities/withholding-slip.entity';

@ApiTags('Purchase - Withholding Slips')
@Controller('withholding-slips')
export class WithholdingSlipController {
  constructor(private readonly withholdingSlipService: WithholdingSlipService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new withholding slip' })
  @ApiResponse({ status: 201, description: 'Withholding slip created successfully', type: WithholdingSlip })
  async create(@Body() dto: CreateWithholdingSlipDto): Promise<WithholdingSlip> {
    const userId = 'system';
    return this.withholdingSlipService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all withholding slips with filtering' })
  @ApiQuery({ name: 'slipType', required: false, enum: ['PPH_21', 'PPH_23', 'PPH_4_AYAT_2', 'PPH_15', 'PPH_22', 'PPH_26'] })
  @ApiQuery({ name: 'taxPeriod', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ISSUED', 'CANCELLED', 'AMENDED'] })
  @ApiQuery({ name: 'xmlGenerated', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('slipType') slipType?: string,
    @Query('taxPeriod') taxPeriod?: string,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: string,
    @Query('xmlGenerated') xmlGenerated?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: WithholdingSlip[]; total: number; page: number; limit: number }> {
    const filter: WithholdingSlipFilter = {
      slipType: slipType as any,
      taxPeriod,
      subjectId,
      status: status as any,
      xmlGenerated: xmlGenerated !== undefined ? xmlGenerated === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.withholdingSlipService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withholding slip by ID' })
  @ApiResponse({ status: 200, description: 'Withholding slip found', type: WithholdingSlip })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<WithholdingSlip> {
    return this.withholdingSlipService.findById(id);
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Issue withholding slip' })
  async issue(@Param('id', ParseUUIDPipe) id: string): Promise<WithholdingSlip> {
    const userId = 'system';
    return this.withholdingSlipService.issue(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel withholding slip' })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<WithholdingSlip> {
    const userId = 'system';
    return this.withholdingSlipService.cancel(id, userId);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate withholding slip for XML export' })
  async validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.withholdingSlipService.validateForExport(id);
  }

  @Post('generate-pph21-xml')
  @ApiOperation({ summary: 'Generate PPh 21 XML for multiple slips' })
  async generatePph21Xml(
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    const userId = 'system';
    const result = await this.withholdingSlipService.generatePph21Xml(ids, userId);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }

  @Post('generate-unifikasi-xml')
  @ApiOperation({ summary: 'Generate PPh Unifikasi XML for multiple slips' })
  async generatePphUnifikasiXml(
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    const userId = 'system';
    const result = await this.withholdingSlipService.generatePphUnifikasiXml(ids, userId);

    if (result.success && result.content) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(400).json(result);
    }
  }
}
