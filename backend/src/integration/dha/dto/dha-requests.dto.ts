import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class VerifyPatientDto {
  @ValidateIf((dto: VerifyPatientDto) => !dto.shaNumber && !dto.patientNumber)
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  registrationNumber: string;

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
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  memberNumber: string;

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
