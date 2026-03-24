import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { CrmService } from '../services/crm.service';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  getAllLeads(@Query() query: any) {
    return this.crmService.getAllLeads(query);
  }

  @Post('leads')
  createLead(@Body() body: any) {
    return this.crmService.createLead(body);
  }

  @Get('leads/pipeline')
  getPipelineSummary() {
    return this.crmService.getPipelineSummary();
  }

  @Get('leads/:id')
  getLeadById(@Param('id') id: string) {
    return this.crmService.getLeadById(id);
  }

  @Patch('leads/:id/status')
  updateLeadStatus(@Param('id') id: string, @Body() body: { status: any }) {
    return this.crmService.updateLeadStatus(id, body.status);
  }

  @Post('activities')
  addActivity(@Body() body: any) {
    return this.crmService.addActivity(body);
  }

  @Get('customers/:partnerId/history')
  getCustomerHistory(@Param('partnerId') partnerId: string) {
    return this.crmService.getCustomerHistory(partnerId);
  }
}
