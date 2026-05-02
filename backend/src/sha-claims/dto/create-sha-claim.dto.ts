import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateShaClaimDto {
  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  invoiceId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  memberNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  diagnosisText?: string;

  @IsOptional()
  @IsDateString()
  servicePeriodStart?: string;

  @IsOptional()
  @IsDateString()
  servicePeriodEnd?: string;

  @IsOptional()
  @IsNumber()
  claimedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  patientSignatureUrl?: string;

  @IsOptional()
  @IsString()
  facilitySignatureUrl?: string;

  @IsOptional()
  @IsString()
  rubberStampUrl?: string;
}
