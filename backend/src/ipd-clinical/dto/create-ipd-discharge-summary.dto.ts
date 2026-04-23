import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateIpdDischargeSummaryDto {
  @IsInt()
  admissionId: number;

  @IsString()
  dischargeDiagnosis: string;

  @IsString()
  hospitalCourse: string;

  @IsString()
  conditionOnDischarge: string;

  @IsOptional()
  @IsString()
  dischargeMedications?: string;

  @IsOptional()
  @IsString()
  followUpInstructions?: string;

  @IsOptional()
  @IsInt()
  dischargedByStaffId?: number;

  @IsOptional()
  @IsDateString()
  dischargeDate?: string;
}
