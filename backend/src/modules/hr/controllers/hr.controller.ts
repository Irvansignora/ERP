import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HrService } from '../services/hr.service';
import { CurrentUser, AuthUser } from '@modules/auth/decorators/current-user.decorator';

@ApiBearerAuth('JWT')
@ApiTags('HR & Payroll')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  getAllEmployees(@Query() query: any) {
    return this.hrService.getAllEmployees(query);
  }

  @Post('employees')
  createEmployee(@Body() body: any, @CurrentUser() user: AuthUser) {
    // FIX (Bug #2): Pass real userId from JWT
    return this.hrService.createEmployee({ ...body, userId: user.id });
  }

  @Get('employees/:id')
  getEmployeeById(@Param('id') id: string) {
    return this.hrService.getEmployeeById(id);
  }

  @Post('attendance')
  recordAttendance(@Body() body: any) {
    return this.hrService.recordAttendance(body);
  }

  @Get('attendance/:employeeId')
  getAttendance(
    @Param('employeeId') employeeId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.hrService.getAttendance(employeeId, parseInt(month), parseInt(year));
  }

  @Post('payslips/generate')
  generatePayslip(@Body() body: any) {
    return this.hrService.generatePayslip(body);
  }

  @Get('payroll/summary')
  getPayrollSummary(@Query('period') period: string) {
    return this.hrService.getPayrollSummary(period);
  }

  @Post('payslips/:id/approve')
  approvePayslip(@Param('id') id: string) {
    return this.hrService.approvePayslip(id);
  }

  @Post('payslips/:id/mark-paid')
  markPayslipPaid(@Param('id') id: string) {
    return this.hrService.markPayslipPaid(id);
  }
}
