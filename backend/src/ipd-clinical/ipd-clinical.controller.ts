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

@Controller('ipd-clinical')
@UseGuards(AuthGuard('jwt'))
export class IpdClinicalController {
  constructor(private readonly ipdClinicalService: IpdClinicalService) {}

  @Post('progress-notes')
  createProgressNote(@Body() dto: CreateIpdProgressNoteDto) {
    return this.ipdClinicalService.createProgressNote(dto);
  }

  @Get('progress-notes/admission/:admissionId')
  getProgressNotesByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getProgressNotesByAdmission(admissionId);
  }

  @Post('vitals')
  createVitalRecord(@Body() dto: CreateIpdVitalRecordDto) {
    return this.ipdClinicalService.createVitalRecord(dto);
  }

  @Get('vitals/admission/:admissionId')
  getVitalRecordsByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getVitalRecordsByAdmission(admissionId);
  }

  @Post('doctor-reviews')
  createDoctorReview(@Body() dto: CreateIpdDoctorReviewDto) {
    return this.ipdClinicalService.createDoctorReview(dto);
  }

  @Get('doctor-reviews/admission/:admissionId')
  getDoctorReviewsByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getDoctorReviewsByAdmission(admissionId);
  }

  @Post('treatment-chart')
  createTreatmentEntry(@Body() dto: CreateTreatmentChartEntryDto) {
    return this.ipdClinicalService.createTreatmentEntry(dto);
  }

  @Get('treatment-chart/admission/:admissionId')
  getTreatmentChartByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getTreatmentChartByAdmission(admissionId);
  }

  @Patch('treatment-chart/:entryId/administer')
  administerTreatment(
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() body: { administeredByStaffId?: number },
  ) {
    return this.ipdClinicalService.administerTreatment(
      entryId,
      body?.administeredByStaffId,
    );
  }

  @Post('admissions/:admissionId/medicine-administration')
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
  createOrUpdateDischargeSummary(@Body() dto: CreateIpdDischargeSummaryDto) {
    return this.ipdClinicalService.createOrUpdateDischargeSummary(dto);
  }

  @Get('discharge-summary/admission/:admissionId')
  getDischargeSummaryByAdmission(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getDischargeSummaryByAdmission(admissionId);
  }

  @Get('lab-orders/admission/:admissionId')
  getAdmissionLabOrders(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getAdmissionLabOrders(admissionId);
  }

  @Get('dashboard/admission/:admissionId')
  getAdmissionClinicalDashboard(
    @Param('admissionId', ParseIntPipe) admissionId: number,
  ) {
    return this.ipdClinicalService.getAdmissionClinicalDashboard(admissionId);
  }

  @Get('documents/admissions/:admissionId/medical-summary.pdf')
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
