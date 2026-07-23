import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDentalEncounterDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  examinationNotes?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  consentReference?: string;

  @IsOptional()
  @IsDateString()
  nextReviewAt?: string;
}

export class AddDentalChartEntryDto {
  @IsString()
  toothCode: string;

  @IsOptional()
  @IsString()
  surfaceCode?: string;

  @IsString()
  conditionCode: string;

  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddDentalProcedureDto {
  @IsOptional()
  @IsString()
  toothCode?: string;

  @IsString()
  procedureCode: string;

  @IsString()
  procedureName: string;

  @IsOptional()
  @IsString()
  procedureNotes?: string;
}

export class CreateOrthopedicCaseDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsInt()
  patientId: number;

  @IsString()
  anatomicalSite: string;

  @IsOptional()
  @IsString()
  injuryMechanism?: string;

  @IsOptional()
  @IsString()
  laterality?: string;

  @IsOptional()
  @IsString()
  fractureClassification?: string;

  @IsOptional()
  @IsString()
  imagingSummary?: string;

  @IsOptional()
  @IsString()
  managementPlan?: string;

  @IsOptional()
  @IsString()
  procedureDocumentation?: string;

  @IsOptional()
  @IsDateString()
  followUpAt?: string;
}

export class AddOrthopedicImplantDto {
  @IsString()
  implantName: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  removalDueAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePhysiotherapyReferralDto {
  @IsString()
  referralReason: string;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  precautions?: string;
}
