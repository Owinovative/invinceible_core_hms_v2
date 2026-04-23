import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IpdClinicalService } from './ipd-clinical.service';
import { CreateIpdProgressNoteDto } from './dto/create-ipd-progress-note.dto';
import { CreateTreatmentChartEntryDto } from './dto/create-treatment-chart-entry.dto';
import { CreateIpdVitalRecordDto } from './dto/create-ipd-vital-record.dto';
import { CreateIpdDoctorReviewDto } from './dto/create-ipd-doctor-review.dto';
import { CreateIpdDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto';

@Controller('ipd-clinical')
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

  @Post('discharge-summary')
  createOrUpdateDischargeSummary(
    @Body() dto: CreateIpdDischargeSummaryDto,
  ) {
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
}
