import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JournalEntryService, CreateJournalEntryDto } from '../services/journal-entry.service';
import { JournalEntry, JournalStatus } from '@prisma/client';

@ApiTags('General Ledger - Journal Entries')
@Controller('journal-entries')
export class JournalEntryController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully', type: JournalEntry })
  async create(@Body() dto: CreateJournalEntryDto): Promise<JournalEntry> {
    const userId = 'system';
    return this.journalEntryService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all journal entries' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'REVERSED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journalEntryService.findAll({
      period,
      status: status as JournalStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<JournalEntry> {
    return this.journalEntryService.findById(id);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  async post(@Param('id', ParseUUIDPipe) id: string): Promise<JournalEntry> {
    const userId = 'system';
    return this.journalEntryService.post(id, userId);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a journal entry' })
  async reverse(@Param('id', ParseUUIDPipe) id: string): Promise<JournalEntry> {
    const userId = 'system';
    return this.journalEntryService.reverse(id, userId);
  }
}
