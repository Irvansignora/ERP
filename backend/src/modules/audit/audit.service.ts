import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    userEmail?: string;
    action: string;
    module: string;
    entityId?: string;
    entityType?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async getLogs(params: {
    userId?: string;
    module?: string;
    action?: string;
    limit?: number;
    page?: number;
  }) {
    const skip = ((params.page ?? 1) - 1) * (params.limit ?? 50);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          ...(params.userId && { userId: params.userId }),
          ...(params.module && { module: params.module }),
          ...(params.action && { action: params.action }),
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, total };
  }
}
