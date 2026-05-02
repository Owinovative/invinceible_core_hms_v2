import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateShaClaimDto {
  @IsOptional()
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsInt()
  invoiceId?: number | null;

  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'])
  statusCode?: string;

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
  @IsNumber()
  approvedAmount?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  rejectedAmount?: number;

  @IsOptional()
  @IsString()
  rejectionReason?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  patientSignatureUrl?: string | null;

  @IsOptional()
  @IsString()
  facilitySignatureUrl?: string | null;

  @IsOptional()
  @IsString()
  rubberStampUrl?: string | null;
}
