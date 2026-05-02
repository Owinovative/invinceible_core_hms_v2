import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ClinicalAiTask {
  SOAP_NOTE = 'SOAP_NOTE',
  TREATMENT_PLAN = 'TREATMENT_PLAN',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  PATIENT_INSTRUCTIONS = 'PATIENT_INSTRUCTIONS',
  LAB_RESULT_SUMMARY = 'LAB_RESULT_SUMMARY',
  BILLING_NARRATIVE = 'BILLING_NARRATIVE',
  PHARMACY_COUNSELLING = 'PHARMACY_COUNSELLING',
  SYSTEM_NAVIGATION = 'SYSTEM_NAVIGATION',
  GENERAL_DRAFT = 'GENERAL_DRAFT',
}

export class ClinicalAiRequestDto {
  @IsEnum(ClinicalAiTask)
  task!: ClinicalAiTask;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  audience?: string;
}

export class IdentityOcrRequestDto {
  @IsString()
  imageDataUrl!: string;
}
