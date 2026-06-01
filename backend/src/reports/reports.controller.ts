import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getReportsDashboard(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getReportsDashboard(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('dashboard/export')
  getReportsDashboardExport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getReportsDashboardExport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('modules')
  getModuleOperationsReport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getModuleOperationsReport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('modules/export')
  getModuleOperationsExport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getModuleOperationsExport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('dashboard-summary')
  getDashboardSummary(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getDashboardSummary(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('opd')
  getOpdAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getOpdAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('billing')
  getBillingAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getBillingAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('lab')
  getLabAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getLabAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('pharmacy')
  getPharmacyAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getPharmacyAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('otc-sales')
  getOtcSalesReport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getOtcSalesReport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('otc-sales/export')
  getOtcSalesReportExport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getOtcSalesReportExport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('profit')
  getProfitAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getProfitAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('profit/export')
  getProfitAnalyticsExport(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getProfitAnalyticsExport(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('ipd')
  getIpdAnalytics(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getIpdAnalytics(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('doctor-workload')
  getDoctorWorkload(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getDoctorWorkload(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('system-health')
  getSystemHealth(
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportsService.getSystemHealthSummary(
      this.reportsService.applyUserScopeToFilter(user, filter),
    );
  }

  @Get('medical/consultations/:id.pdf')
  async downloadConsultationMedicalReportPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const report =
      await this.reportsService.getConsultationMedicalReportPdf(id, user);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
      'Cache-Control': 'private, no-store',
    });
    response.end(report.buffer);
  }
}
