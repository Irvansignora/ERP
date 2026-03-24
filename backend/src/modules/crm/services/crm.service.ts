import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(dto: {
    title: string;
    partnerId?: string;
    expectedValue?: number;
    expectedCloseDate?: Date;
    probability?: number;
    assignedTo?: string;
    notes?: string;
    userId?: string;
  }) {
    return this.prisma.crmLead.create({
      data: {
        title: dto.title,
        partnerId: dto.partnerId,
        expectedValue: dto.expectedValue,
        expectedCloseDate: dto.expectedCloseDate,
        probability: dto.probability,
        assignedTo: dto.assignedTo,
        notes: dto.notes,
        createdBy: dto.userId,
      },
      include: { partner: true, activities: true },
    });
  }

  async getAllLeads(params: { status?: LeadStatus; assignedTo?: string; limit?: number }) {
    return this.prisma.crmLead.findMany({
      where: {
        ...(params.status && { status: params.status }),
        ...(params.assignedTo && { assignedTo: params.assignedTo }),
      },
      include: { partner: true, activities: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { updatedAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async getLeadById(id: string) {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id },
      include: { partner: true, activities: { orderBy: { createdAt: 'desc' } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLeadStatus(id: string, status: LeadStatus) {
    return this.prisma.crmLead.update({
      where: { id },
      data: { status },
    });
  }

  async addActivity(dto: {
    leadId: string;
    activityType: string;
    summary: string;
    scheduledAt?: Date;
    completedAt?: Date;
    notes?: string;
    userId?: string;
  }) {
    return this.prisma.crmActivity.create({
      data: {
        leadId: dto.leadId,
        activityType: dto.activityType,
        summary: dto.summary,
        scheduledAt: dto.scheduledAt,
        completedAt: dto.completedAt,
        notes: dto.notes,
        createdBy: dto.userId,
      },
    });
  }

  async getPipelineSummary() {
    const leads = await this.prisma.crmLead.findMany();
    const pipeline = Object.values(LeadStatus).map((status) => {
      const items = leads.filter((l) => l.status === status);
      return {
        status,
        count: items.length,
        totalValue: items.reduce((sum, l) => sum + Number(l.expectedValue ?? 0), 0),
      };
    });
    return { pipeline, totalLeads: leads.length };
  }

  // Customer transaction history
  async getCustomerHistory(partnerId: string) {
    const [salesOrders, quotations, leads] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { customerId: partnerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.quotation.findMany({
        where: { customerId: partnerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.crmLead.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return { salesOrders, quotations, leads };
  }
}
