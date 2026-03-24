import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Employees ────────────────────────────────────────────
  async createEmployee(dto: {
    partnerId: string;
    department?: string;
    position?: string;
    basicSalary: number;
    joinDate: Date;
    userId?: string;
  }) {
    // FIX (Bug #4): Per-year sequential employee numbering.
    // Previously: count() over all time → EMP-00001 restarts incorrectly after bulk deletes
    // or produces gaps on concurrent inserts. Now scoped to current year.
    const year = new Date().getFullYear();
    const count = await this.prisma.employee.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const employeeNumber = `EMP-${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.employee.create({
      data: {
        employeeNumber,
        partnerId: dto.partnerId,
        department: dto.department,
        position: dto.position,
        basicSalary: dto.basicSalary,
        joinDate: dto.joinDate,
      },
      include: { partner: true },
    });
  }

  async getAllEmployees(params: { department?: string; status?: any }) {
    return this.prisma.employee.findMany({
      where: {
        ...(params.department && { department: params.department }),
        ...(params.status && { status: params.status }),
      },
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEmployeeById(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: { partner: true, payslips: { orderBy: { createdAt: 'desc' }, take: 12 } },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  // ── Attendance ───────────────────────────────────────────
  async recordAttendance(dto: {
    employeeId: string;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status?: string;
    notes?: string;
  }) {
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: dto.date } },
      update: { checkIn: dto.checkIn, checkOut: dto.checkOut, status: dto.status, notes: dto.notes },
      create: {
        employeeId: dto.employeeId,
        date: dto.date,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        status: dto.status ?? 'PRESENT',
        notes: dto.notes,
      },
    });
  }

  async getAttendance(employeeId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  // ── Payslip ──────────────────────────────────────────────
  async generatePayslip(dto: {
    employeeId: string;
    period: string; // MM-YYYY
    allowances?: number;
    deductions?: number;
    pph21Amount?: number;
  }) {
    const [month, year] = dto.period.split('-').map(Number);
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    // FIX (Bug #13): Guard against overwriting a finalized payslip.
    // Previously: upsert would silently overwrite even PAID/APPROVED payslips.
    const existing = await this.prisma.payslip.findUnique({
      where: { employeeId_period: { employeeId: dto.employeeId, period: dto.period } },
    });

    if (existing && ['APPROVED', 'PAID'].includes(existing.status)) {
      throw new BadRequestException(
        `Payslip for period ${dto.period} is already in status "${existing.status}" and cannot be regenerated. ` +
        `To make changes, please cancel the payslip first.`
      );
    }

    const basicSalary = Number(employee.basicSalary);
    const allowances = dto.allowances ?? 0;
    const deductions = dto.deductions ?? 0;
    const pph21 = dto.pph21Amount ?? 0;
    const netSalary = basicSalary + allowances - deductions - pph21;

    return this.prisma.payslip.upsert({
      where: { employeeId_period: { employeeId: dto.employeeId, period: dto.period } },
      update: { basicSalary, allowances, deductions, pph21Amount: pph21, netSalary },
      create: {
        employeeId: dto.employeeId,
        period: dto.period,
        month,
        year,
        basicSalary,
        allowances,
        deductions,
        pph21Amount: pph21,
        netSalary,
      },
      include: { employee: { include: { partner: true } } },
    });
  }

  async approvePayslip(id: string) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.status === 'PAID') {
      throw new BadRequestException('Cannot approve a payslip that has already been paid');
    }
    return this.prisma.payslip.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async markPayslipPaid(id: string) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED payslips can be marked as paid');
    }
    return this.prisma.payslip.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async getPayrollSummary(period: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { period },
      include: { employee: { include: { partner: true } } },
    });
    return {
      period,
      totalEmployees: payslips.length,
      totalBasicSalary: payslips.reduce((s, p) => s + Number(p.basicSalary), 0),
      totalAllowances: payslips.reduce((s, p) => s + Number(p.allowances), 0),
      totalDeductions: payslips.reduce((s, p) => s + Number(p.deductions), 0),
      totalPph21: payslips.reduce((s, p) => s + Number(p.pph21Amount), 0),
      totalNetSalary: payslips.reduce((s, p) => s + Number(p.netSalary), 0),
      payslips,
    };
  }
}
