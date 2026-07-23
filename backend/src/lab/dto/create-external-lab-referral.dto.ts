import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateExternalLabReferralItemDto {
  @IsInt()
  testId: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateExternalLabReferralDto {
  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsString()
  referringFacilityName: string;

  @IsOptional()
  @IsString()
  referringFacilityContact?: string;

  @IsOptional()
  @IsString()
  referringClinicianName?: string;

  @IsString()
  externalPatientName: string;

  @IsOptional()
  @IsString()
  externalPatientIdentifier?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;

  @IsOptional()
  @IsEmail()
  patientEmail?: string;

  @IsString()
  sampleReference: string;

  @IsOptional()
  @IsString()
  specimenType?: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExternalLabReferralItemDto)
  items: CreateExternalLabReferralItemDto[];
}

export class CreateExternalLabResultDto {
  @IsString()
  resultValue: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateExternalLabPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsIn(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  transactionReference?: string;
}

export class CreateExternalLabReportShareDto {
  @IsOptional()
  @IsInt()
  expiresInHours?: number;
}
