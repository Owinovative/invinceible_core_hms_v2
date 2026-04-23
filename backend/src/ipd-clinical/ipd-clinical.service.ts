import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IpdService } from '../ipd/ipd.service';
import { StaffService } from '../staff/staff.service';
import { CreateIpdProgressNoteDto } from './dto/create-ipd-progress-note.dto';
import { CreateTreatmentChartEntryDto } from './dto/create-treatment-chart-entry.dto';
import { CreateIpdVitalRecordDto } from './dto/create-ipd-vital-record.dto';
import { CreateIpdDoctorReviewDto } from './dto/create-ipd-doctor-review.dto';
import { CreateIpdDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto';

@Injectable()
export class IpdClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ipdService: IpdService,
    private readonly staffService: StaffService,
  ) {}

  async createProgressNote(dto: CreateIpdProgressNoteDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.recordedByStaffId) {
      await this.staffService.findOne(dto.recordedByStaffId);
    }

    return this.prisma.ipdProgressNote.create({
      data: {
        admissionId: dto.admissionId,
        recordedByStaffId: dto.recordedByStaffId,
        noteType: dto.noteType,
        noteText: dto.noteText,
      },
      include: {
        admission: true,
        recordedBy: true,
      },
    });
  }

  async getProgressNotesByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdProgressNote.findMany({
      where: { admissionId },
      include: {
        recordedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVitalRecord(dto: CreateIpdVitalRecordDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.recordedByStaffId) {
      await this.staffService.findOne(dto.recordedByStaffId);
    }

    return this.prisma.ipdVitalRecord.create({
      data: {
        admissionId: dto.admissionId,
        recordedByStaffId: dto.recordedByStaffId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSaturation: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi: dto.bmi,
        painScore: dto.painScore,
        notes: dto.notes,
      },
      include: {
        admission: true,
        recordedBy: true,
      },
    });
  }

  async getVitalRecordsByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdVitalRecord.findMany({
      where: { admissionId },
      include: {
        recordedBy: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async createDoctorReview(dto: CreateIpdDoctorReviewDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.reviewedByStaffId) {
      await this.staffService.findOne(dto.reviewedByStaffId);
    }

    return this.prisma.ipdDoctorReview.create({
      data: {
        admissionId: dto.admissionId,
        reviewedByStaffId: dto.reviewedByStaffId,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        chiefComplaint: dto.chiefComplaint,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        reviewNotes: dto.reviewNotes,
      },
      include: {
        admission: true,
        reviewedBy: true,
      },
    });
  }

  async getDoctorReviewsByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdDoctorReview.findMany({
      where: { admissionId },
      include: {
        reviewedBy: true,
      },
      orderBy: { reviewDate: 'desc' },
    });
  }

  async createTreatmentEntry(dto: CreateTreatmentChartEntryDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.orderedByStaffId) {
      await this.staffService.findOne(dto.orderedByStaffId);
    }

    if (dto.administeredByStaffId) {
      await this.staffService.findOne(dto.administeredByStaffId);
    }

    return this.prisma.treatmentChartEntry.create({
      data: {
        admissionId: dto.admissionId,
        orderedByStaffId: dto.orderedByStaffId,
        administeredByStaffId: dto.administeredByStaffId,
        treatmentType: dto.treatmentType,
        treatmentName: dto.treatmentName,
        dosage: dto.dosage,
        route: dto.route,
        frequency: dto.frequency,
        statusCode: dto.statusCode ?? 'PLANNED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        notes: dto.notes,
      },
      include: {
        admission: true,
        orderedBy: true,
        administeredBy: true,
      },
    });
  }

  async getTreatmentChartByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.treatmentChartEntry.findMany({
      where: { admissionId },
      include: {
        orderedBy: true,
        administeredBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async administerTreatment(entryId: number, administeredByStaffId?: number) {
    const entry = await this.prisma.treatmentChartEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(
        `Treatment chart entry with id ${entryId} not found`,
      );
    }

    if (administeredByStaffId) {
      await this.staffService.findOne(administeredByStaffId);
    }

    return this.prisma.treatmentChartEntry.update({
      where: { id: entryId },
      data: {
        statusCode: 'ADMINISTERED',
        administeredAt: new Date(),
        administeredByStaffId,
      },
      include: {
        admission: true,
        orderedBy: true,
        administeredBy: true,
      },
    });
  }

  async createOrUpdateDischargeSummary(dto: CreateIpdDischargeSummaryDto) {
    const admission = await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.dischargedByStaffId) {
      await this.staffService.findOne(dto.dischargedByStaffId);
    }

    const saved = await this.prisma.ipdDischargeSummary.upsert({
      where: {
        admissionId: dto.admissionId,
      },
      update: {
        dischargeDiagnosis: dto.dischargeDiagnosis,
        hospitalCourse: dto.hospitalCourse,
        conditionOnDischarge: dto.conditionOnDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        dischargedByStaffId: dto.dischargedByStaffId,
        dischargeDate: dto.dischargeDate
          ? new Date(dto.dischargeDate)
          : undefined,
      },
      create: {
        admissionId: dto.admissionId,
        dischargeDiagnosis: dto.dischargeDiagnosis,
        hospitalCourse: dto.hospitalCourse,
        conditionOnDischarge: dto.conditionOnDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        dischargedByStaffId: dto.dischargedByStaffId,
        dischargeDate: dto.dischargeDate
          ? new Date(dto.dischargeDate)
          : undefined,
      },
      include: {
        admission: true,
        dischargedBy: true,
      },
    });

    if ((admission.statusCode || '').toUpperCase() === 'DISCHARGED') {
      await this.prisma.admission.update({
        where: { id: dto.admissionId },
        data: {
          dischargedAt: saved.dischargeDate,
        },
      });
    }

    return saved;
  }

  async getDischargeSummaryByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdDischargeSummary.findUnique({
      where: { admissionId },
      include: {
        dischargedBy: true,
      },
    });
  }

  async getAdmissionLabOrders(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.labOrder.findMany({
      where: { admissionId },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdmissionClinicalDashboard(admissionId: number) {
    const admission = await this.ipdService.getAdmissionById(admissionId);

    const progressNotes = await this.prisma.ipdProgressNote.findMany({
      where: { admissionId },
      include: { recordedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    const vitalRecords = await this.prisma.ipdVitalRecord.findMany({
      where: { admissionId },
      include: { recordedBy: true },
      orderBy: { recordedAt: 'desc' },
    });

    const doctorReviews = await this.prisma.ipdDoctorReview.findMany({
      where: { admissionId },
      include: { reviewedBy: true },
      orderBy: { reviewDate: 'desc' },
    });

    const treatmentChart = await this.prisma.treatmentChartEntry.findMany({
      where: { admissionId },
      include: {
        orderedBy: true,
        administeredBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const dischargeSummary = await this.prisma.ipdDischargeSummary.findUnique({
      where: { admissionId },
      include: {
        dischargedBy: true,
      },
    });

    const labOrders = await this.prisma.labOrder.findMany({
      where: { admissionId },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      admission,
      doctorReviews,
      vitalRecords,
      progressNotes,
      treatmentChart,
      dischargeSummary,
      labOrders,
    };
  }
}
