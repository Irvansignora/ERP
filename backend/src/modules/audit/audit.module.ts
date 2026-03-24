import { Module } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { AuditLogService } from './audit.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  getLogs(@Query() query: any) {
    return this.auditLogService.getLogs(query);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
