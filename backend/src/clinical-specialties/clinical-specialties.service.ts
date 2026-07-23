import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ScopeService } from '../auth/scope.service';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddDentalChartEntryDto,
  AddDentalProcedureDto,
  AddOrthopedicImplantDto,
  CreateDentalEncounterDto,
  CreateOrthopedicCaseDto,
  CreatePhysiotherapyReferralDto,
} from './dto/clinical-specialties.dto';

@Injectable()
export class ClinicalSpecialtiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly billing: BillingService,
  ) {}

  private requireClinician(user: RequestUser) {
    if (!user.staffId) {
      throw new BadRequestException(
        'A linked clinician staff profile is required',
      );
    }
    return user.staffId;
  }

  private async getPatient(patientId: number, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.scope.assertFacilityAccess(user, patient.facilityId);
    return patient;
  }

  private async assertBranchFacility(
    branchId: number | null,
    facilityId: number,
  ) {
    if (!branchId) return;
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { facilityId: true },
    });
    if (!branch || branch.facilityId !== facilityId) {
      throw new BadRequestException(
        'Selected branch does not belong to the patient facility',
      );
    }
  }

  async listDental(user: RequestUser) {
    return this.prisma.dentalEncounter.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: {
        patient: true,
        clinician: true,
        chartEntries: true,
        procedures: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 250,
    });
  }

  async createDental(dto: CreateDentalEncounterDto, user: RequestUser) {
    const patient = await this.getPatient(dto.patientId, user);
    const clinicianStaffId = this.requireClinician(user);
    const branchId = dto.branchId ?? user.homeBranchId ?? null;
    this.scope.assertBranchAccess(user, patient.facilityId, branchId);
    await this.assertBranchFacility(branchId, patient.facilityId);
    return this.prisma.dentalEncounter.create({
      data: {
        encounterNumber: `DEN-${randomUUID().slice(0, 12).toUpperCase()}`,
        facilityId: patient.facilityId,
        branchId,
        patientId: patient.id,
        clinicianStaffId,
        chiefComplaint: dto.chiefComplaint?.trim(),
        examinationNotes: dto.examinationNotes?.trim(),
        treatmentPlan: dto.treatmentPlan?.trim(),
        consentReference: dto.consentReference?.trim(),
        nextReviewAt: dto.nextReviewAt ? new Date(dto.nextReviewAt) : undefined,
      },
      include: { patient: true, clinician: true },
    });
  }

  private async getDental(id: number, user: RequestUser) {
    const encounter = await this.prisma.dentalEncounter.findUnique({
      where: { id },
    });
    if (!encounter) throw new NotFoundException('Dental encounter not found');
    this.scope.assertBranchAccess(
      user,
      encounter.facilityId,
      encounter.branchId,
    );
    return encounter;
  }

  async addDentalChart(
    id: number,
    dto: AddDentalChartEntryDto,
    user: RequestUser,
  ) {
    await this.getDental(id, user);
    return this.prisma.dentalChartEntry.create({
      data: {
        dentalEncounterId: id,
        toothCode: dto.toothCode.trim().toUpperCase(),
        surfaceCode: dto.surfaceCode?.trim().toUpperCase(),
        conditionCode: dto.conditionCode.trim().toUpperCase(),
        diagnosisCode: dto.diagnosisCode?.trim().toUpperCase(),
        notes: dto.notes?.trim(),
      },
    });
  }

  async addDentalProcedure(
    id: number,
    dto: AddDentalProcedureDto,
    user: RequestUser,
  ) {
    const encounter = await this.getDental(id, user);
    const price = await this.billing.resolveChargePrice({
      facilityId: encounter.facilityId,
      branchId: encounter.branchId,
      category: 'DENTAL',
      code: dto.procedureCode.trim().toUpperCase(),
      fallbackPrice: 0,
    });
    if (Number(price) <= 0) {
      throw new BadRequestException(
        `No active non-zero dental tariff is configured for ${dto.procedureCode.trim().toUpperCase()}`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const procedure = await tx.dentalProcedure.create({
        data: {
          dentalEncounterId: id,
          toothCode: dto.toothCode?.trim().toUpperCase(),
          procedureCode: dto.procedureCode.trim().toUpperCase(),
          procedureName: dto.procedureName.trim(),
          procedureNotes: dto.procedureNotes?.trim(),
          priceAmount: price,
        },
      });
      const billing = await this.billing.addAutoInvoiceItemInTransaction(tx, {
        patientId: encounter.patientId,
        facilityId: encounter.facilityId,
        branchId: encounter.branchId,
        createdByStaffId: user.staffId,
        description: `Dental procedure: ${procedure.procedureName}`,
        quantity: 1,
        unitPrice: Number(price),
        notes: procedure.procedureNotes ?? undefined,
        sourceModule: 'DENTAL',
        sourceEntityType: 'DENTAL_PROCEDURE',
        sourceEntityId: String(procedure.id),
      });
      return tx.dentalProcedure.update({
        where: { id: procedure.id },
        data: { invoiceItemId: billing.item.id },
      });
    });
  }

  async listOrthopedic(user: RequestUser) {
    return this.prisma.orthopedicCase.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: {
        patient: true,
        clinician: true,
        implants: true,
        physiotherapyReferrals: true,
      },
      orderBy: { openedAt: 'desc' },
      take: 250,
    });
  }

  async createOrthopedic(dto: CreateOrthopedicCaseDto, user: RequestUser) {
    const patient = await this.getPatient(dto.patientId, user);
    const clinicianStaffId = this.requireClinician(user);
    const branchId = dto.branchId ?? user.homeBranchId ?? null;
    this.scope.assertBranchAccess(user, patient.facilityId, branchId);
    await this.assertBranchFacility(branchId, patient.facilityId);
    return this.prisma.orthopedicCase.create({
      data: {
        caseNumber: `ORT-${randomUUID().slice(0, 12).toUpperCase()}`,
        facilityId: patient.facilityId,
        branchId,
        patientId: patient.id,
        clinicianStaffId,
        anatomicalSite: dto.anatomicalSite.trim(),
        injuryMechanism: dto.injuryMechanism?.trim(),
        laterality: dto.laterality?.trim().toUpperCase(),
        fractureClassification: dto.fractureClassification?.trim(),
        imagingSummary: dto.imagingSummary?.trim(),
        managementPlan: dto.managementPlan?.trim(),
        procedureDocumentation: dto.procedureDocumentation?.trim(),
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined,
      },
      include: { patient: true, clinician: true },
    });
  }

  private async getOrthopedic(id: number, user: RequestUser) {
    const orthopedicCase = await this.prisma.orthopedicCase.findUnique({
      where: { id },
    });
    if (!orthopedicCase) {
      throw new NotFoundException('Orthopedic case not found');
    }
    this.scope.assertBranchAccess(
      user,
      orthopedicCase.facilityId,
      orthopedicCase.branchId,
    );
    return orthopedicCase;
  }

  async addImplant(
    id: number,
    dto: AddOrthopedicImplantDto,
    user: RequestUser,
  ) {
    const orthopedicCase = await this.getOrthopedic(id, user);
    const implantCode = `IMPLANT_${dto.implantName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 60)}`;
    const price = await this.billing.resolveChargePrice({
      facilityId: orthopedicCase.facilityId,
      branchId: orthopedicCase.branchId,
      category: 'ORTHOPEDICS',
      code: implantCode,
      fallbackPrice: 0,
    });
    if (Number(price) <= 0) {
      throw new BadRequestException(
        `No active non-zero orthopedic tariff is configured for ${implantCode}`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const implant = await tx.orthopedicImplant.create({
        data: {
          orthopedicCaseId: id,
          implantName: dto.implantName.trim(),
          manufacturer: dto.manufacturer?.trim(),
          lotNumber: dto.lotNumber?.trim(),
          serialNumber: dto.serialNumber?.trim(),
          removalDueAt: dto.removalDueAt
            ? new Date(dto.removalDueAt)
            : undefined,
          notes: dto.notes?.trim(),
          priceAmount: price,
        },
      });
      const billing = await this.billing.addAutoInvoiceItemInTransaction(tx, {
        patientId: orthopedicCase.patientId,
        facilityId: orthopedicCase.facilityId,
        branchId: orthopedicCase.branchId,
        createdByStaffId: user.staffId,
        description: `Orthopedic implant: ${implant.implantName}`,
        quantity: 1,
        unitPrice: Number(price),
        notes: implant.notes ?? undefined,
        sourceModule: 'ORTHOPEDICS',
        sourceEntityType: 'ORTHOPEDIC_IMPLANT',
        sourceEntityId: String(implant.id),
      });
      return tx.orthopedicImplant.update({
        where: { id: implant.id },
        data: { invoiceItemId: billing.item.id },
      });
    });
  }

  async referPhysiotherapy(
    id: number,
    dto: CreatePhysiotherapyReferralDto,
    user: RequestUser,
  ) {
    await this.getOrthopedic(id, user);
    const referredByStaffId = this.requireClinician(user);
    return this.prisma.physiotherapyReferral.create({
      data: {
        orthopedicCaseId: id,
        referredByStaffId,
        referralReason: dto.referralReason.trim(),
        goals: dto.goals?.trim(),
        precautions: dto.precautions?.trim(),
      },
    });
  }
}
