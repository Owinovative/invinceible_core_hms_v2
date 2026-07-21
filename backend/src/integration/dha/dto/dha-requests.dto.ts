import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DHA_ELIGIBILITY_IDENTIFICATION_TYPES } from '../dha.types';

export class VerifyPatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  identificationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  identificationType?: string;

  @ValidateIf(
    (dto: VerifyPatientDto) =>
      !dto.identificationNumber && !dto.shaNumber && !dto.patientNumber,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  shaNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  patientNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;
}

export class VerifyPractitionerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  practitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  identificationType?: string;

  @ValidateIf(
    (dto: VerifyPractitionerDto) =>
      !dto.registrationNumber && !dto.practitionerId,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  identificationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  board?: string;
}

export class VerifyFacilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  facilityCode: string;
}

export class CheckEligibilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  identificationNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn(DHA_ELIGIBILITY_IDENTIFICATION_TYPES)
  @MaxLength(80)
  identificationType?: string;

  @ValidateIf(
    (dto: CheckEligibilityDto) => !dto.identificationNumber && !dto.nationalId,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  memberNumber?: string;

  @ValidateIf(
    (dto: CheckEligibilityDto) =>
      !dto.identificationNumber && !dto.memberNumber,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nationalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  serviceDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  interventionCode?: string;
}

export class RecordConsentDto {
  @IsInt()
  patientId: number;

  @IsBoolean()
  permit: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  purposeCode?: string;
}

export class SubmitReferralDto {
  @IsInt()
  patientId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  serviceText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetFacilityCode?: string;
}
