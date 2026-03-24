import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { ProjectStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(dto: {
    code: string;
    name: string;
    description?: string;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    userId?: string;
  }) {
    return this.prisma.project.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        customerId: dto.customerId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        budget: dto.budget,
        createdBy: dto.userId,
      },
      include: { customer: true, tasks: true },
    });
  }

  async getAllProjects(params: { status?: ProjectStatus; customerId?: string; limit?: number }) {
    return this.prisma.project.findMany({
      where: {
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
      },
      include: { customer: true, _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { customer: true, tasks: { orderBy: { priority: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProjectStatus(id: string, status: ProjectStatus) {
    return this.prisma.project.update({ where: { id }, data: { status } });
  }

  async createTask(dto: {
    projectId: string;
    title: string;
    description?: string;
    priority?: number;
    assignedTo?: string;
    dueDate?: Date;
  }) {
    return this.prisma.projectTask.create({ data: dto });
  }

  async updateTaskStatus(id: string, status: TaskStatus) {
    const data: any = { status };
    if (status === TaskStatus.DONE) data.completedAt = new Date();
    return this.prisma.projectTask.update({ where: { id }, data });
  }

  async getProjectSummary() {
    const projects = await this.prisma.project.findMany({
      include: { _count: { select: { tasks: true } } },
    });
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'ACTIVE').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      totalBudget: projects.reduce((s, p) => s + Number(p.budget ?? 0), 0),
      totalActualCost: projects.reduce((s, p) => s + Number(p.actualCost), 0),
    };
  }
}
