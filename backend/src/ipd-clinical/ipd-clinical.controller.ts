import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { IpdClinicalService } from './ipd-clinical.service';
import { CreateIpdProgressNoteDto } from './dto/create-ipd-progress-note.dto';
import { CreateTreatmentChartEntryDto } from './dto/create-treatment-chart-entry.dto';
import { CreateIpdVitalRecordDto } from './dto/create-ipd-vital-record.dto';
import { CreateIpdDoctorReviewDto } from './dto/create-ipd-doctor-review.dto';
import { CreateIpdDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto';
import { AdministerIpdMedicineDto } from './dto/administer-ipd-medicine.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('ipd-clinical')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class IpdClinicalController {
  constructor(private readonly ipdClinicalService: IpdClinicalService) {}

  @Post('progress-notes')
  @Permissions('admission.manage')
  createProgressNote(
    @Body() dto: CreateIpdProgressNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.createProgressNote(dto, user);
  }

  @Get('progress-notes/admission/:admissionId')
  @Permissions('patient.read')
  getProgressNotesByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getProgressNotesByAdmission(
      admissionId,
      user,
    );
  }

  @Post('vitals')
  @Permissions('admission.manage')
  createVitalRecord(
    @Body() dto: CreateIpdVitalRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.createVitalRecord(dto, user);
  }

  @Get('vitals/admission/:admissionId')
  @Permissions('patient.read')
  getVitalRecordsByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getVitalRecordsByAdmission(
      admissionId,
      user,
    );
  }

  @Post('doctor-reviews')
  @Permissions('consultation.write')
  createDoctorReview(
    @Body() dto: CreateIpdDoctorReviewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.createDoctorReview(dto, user);
  }

  @Get('doctor-reviews/admission/:admissionId')
  @Permissions('patient.read')
  getDoctorReviewsByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getDoctorReviewsByAdmission(
      admissionId,
      user,
    );
  }

  @Post('treatment-chart')
  @Permissions('admission.manage')
  createTreatmentEntry(
    @Body() dto: CreateTreatmentChartEntryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.createTreatmentEntry(dto, user);
  }

  @Get('treatment-chart/admission/:admissionId')
  @Permissions('patient.read')
  getTreatmentChartByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getTreatmentChartByAdmission(
      admissionId,
      user,
    );
  }

  @Patch('treatment-chart/:entryId/administer')
  @Permissions('admission.manage')
  administerTreatment(
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() body: { administeredByStaffId?: number },
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.administerTreatment(
      entryId,
      body?.administeredByStaffId,
      user,
    );
  }

  @Post('admissions/:admissionId/medicine-administration')
  @Permissions('admission.manage')
  administerAdmissionMedicine(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @Body() dto: AdministerIpdMedicineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.administerAdmissionMedicine(
      admissionId,
      dto,
      user,
    );
  }

  @Post('discharge-summary')
  @Permissions('discharge.complete')
  createOrUpdateDischargeSummary(
    @Body() dto: CreateIpdDischargeSummaryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.createOrUpdateDischargeSummary(dto, user);
  }

  @Get('discharge-summary/admission/:admissionId')
  @Permissions('patient.read')
  getDischargeSummaryByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getDischargeSummaryByAdmission(
      admissionId,
      user,
    );
  }

  @Get('lab-orders/admission/:admissionId')
  @Permissions('patient.read')
  getAdmissionLabOrders(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getAdmissionLabOrders(admissionId, user);
  }

  @Get('dashboard/admission/:admissionId')
  @Permissions('patient.read')
  getAdmissionClinicalDashboard(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdClinicalService.getAdmissionClinicalDashboard(
      admissionId,
      user,
    );
  }

  @Get('documents/admissions/:admissionId/medical-summary.pdf')
  @Permissions('patient.read')
  async downloadMedicalSummaryPdf(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.ipdClinicalService.getMedicalSummaryPdf(
      admissionId,
      user,
    );

    this.sendPdf(response, pdf, `medical-summary-${admissionId}.pdf`);
  }

  @Get('documents/admissions/:admissionId/discharge-summary.pdf')
  @Permissions('patient.read')
  async downloadDischargeSummaryPdf(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.ipdClinicalService.getDischargeSummaryPdf(
      admissionId,
      user,
    );

    this.sendPdf(response, pdf, `discharge-summary-${admissionId}.pdf`);
  }

  @Get('documents/admissions/:admissionId/treatment-chart.pdf')
  @Permissions('patient.read')
  async downloadTreatmentChartPdf(
    @Param('admissionId', ParseIntPipe) admissionId: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.ipdClinicalService.getTreatmentChartPdf(
      admissionId,
      user,
    );

    this.sendPdf(response, pdf, `treatment-chart-${admissionId}.pdf`);
  }

  private sendPdf(response: Response, pdf: Buffer, fileName: string) {
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }
}
