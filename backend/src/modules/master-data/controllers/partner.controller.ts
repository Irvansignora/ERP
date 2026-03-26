import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PartnerService, CreatePartnerDto, UpdatePartnerDto, PartnerFilter } from '../services/partner.service';
import { Partner } from '@domain/entities/partner.entity';
import { CurrentUser, AuthUser } from '@modules/auth/decorators/current-user.decorator';

@ApiBearerAuth('JWT')
@ApiTags('Master Data - Partners')
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully', type: Partner })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() dto: CreatePartnerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Partner> {
    // FIX (Bug #2): Use real userId from JWT instead of hardcoded 'system'
    return this.partnerService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partners with filtering' })
  @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'VENDOR', 'BOTH'] })
  @ApiQuery({ name: 'taxStatus', required: false, enum: ['PKP', 'NON_PKP'] })
  @ApiQuery({ name: 'isPkp', required: false, type: Boolean })
  @ApiQuery({ name: 'isEmployee', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('type') type?: string,
    @Query('taxStatus') taxStatus?: string,
    @Query('isPkp') isPkp?: string,
    @Query('isEmployee') isEmployee?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: Partner[]; total: number; page: number; limit: number }> {
    const filter: PartnerFilter = {
      type: type as any,
      taxStatus: taxStatus as any,
      isPkp: isPkp !== undefined ? isPkp === 'true' : undefined,
      isEmployee: isEmployee !== undefined ? isEmployee === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.partnerService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiResponse({ status: 200, description: 'Partner found', type: Partner })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Partner> {
    return this.partnerService.findById(id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate partner for XML export' })
  async validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.validateForXmlExport(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update partner' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully', type: Partner })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Partner> {
    return this.partnerService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete partner (soft delete)' })
  @ApiResponse({ status: 204, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.partnerService.delete(id, user.id);
  }

  @Get('employees/ter/:category')
  @ApiOperation({ summary: 'Get employees by TER category' })
  async getEmployeesByTerCategory(@Param('category') category: 'A' | 'B' | 'C'): Promise<Partner[]> {
    return this.partnerService.getEmployeesByTerCategory(category as any);
  }

  @Get('tax/pkp')
  @ApiOperation({ summary: 'Get all PKP partners' })
  async getPkpPartners(): Promise<Partner[]> {
    return this.partnerService.getPkpPartners();
  }
}
