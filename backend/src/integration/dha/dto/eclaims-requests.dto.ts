import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const DHA_SERVICE_TYPES = [
  'CAPITATION',
  'OUTPATIENT',
  'INPATIENT',
  'EMERGENCY',
] as const;

export class StartDhaVisitDto {
  @IsInt() @Min(1) patientId: number;
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  interventionCodes: string[];
  @IsIn(DHA_SERVICE_TYPES) serviceType: (typeof DHA_SERVICE_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(20) otp?: string;
  @IsOptional() @IsInt() @Min(1) consentAuthorizationId?: number;
}

export class AddDhaClaimLineDto {
  @IsInt() @Min(1) patientId: number;
  @IsInt() @Min(1) consentAuthorizationId: number;
  @IsString() @IsNotEmpty() @MaxLength(80) interventionCode: string;
  @IsNumberString() unitPrice: string;
  @IsNumberString() quantity: string;
  @IsOptional() @IsString() @MaxLength(255) serviceName?: string;
  @IsOptional() @IsString() @MaxLength(120) serviceIdentifier?: string;
}

export class AddDhaDiagnosisDto {
  @IsInt() @Min(1) patientId: number;
  @IsInt() @Min(1) consentAuthorizationId: number;
  @IsString() @IsNotEmpty() @MaxLength(80) interventionCode: string;
  @IsString() @IsNotEmpty() @MaxLength(80) icdCode: string;
}

export class DhaPreauthDiagnosisDto {
  @IsString() @IsNotEmpty() @MaxLength(80) icdCode: string;
}

export class DhaPreauthItemDto {
  @IsString() @IsNotEmpty() @MaxLength(120) itemCode: string;
  @IsNumberString() unitPrice: string;
  @IsNumberString() quantity: string;
}

export class DhaPreauthDoctorDto {
  @IsString() @IsNotEmpty() @MaxLength(120) identificationNumber: string;
  @IsIn(['registration_number', 'National ID', 'Alien ID', 'Refugee ID'])
  identificationType: string;
  @IsIn(['KMPDC', 'COC', 'NCK', 'PPB']) regulationBody: string;
}

export class CreateDhaPreauthorizationDto {
  @IsInt() @Min(1) patientId: number;
  @IsInt() @Min(1) consentAuthorizationId: number;
  @IsString() @IsNotEmpty() @MaxLength(80) interventionCode: string;
  @IsIn([
    'NORMAL',
    'SURGICAL',
    'ONCOLOGY',
    'RENAL',
    'OPTICAL',
    'IMAGING',
    'DENTAL',
  ])
  preauthType: string;
  @ValidateIf(
    (dto: CreateDhaPreauthorizationDto) => dto.preauthType !== 'NORMAL',
  )
  @IsDateString()
  expectedServiceStartDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(5000) clinicalIndications?: string;
  @IsOptional() @IsString() @MaxLength(5000) historyOfPresentIllness?: string;
  @IsOptional() @IsObject() clinicalData?: Record<string, unknown>;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DhaPreauthDiagnosisDto)
  diagnoses: DhaPreauthDiagnosisDto[];
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DhaPreauthItemDto)
  items: DhaPreauthItemDto[];
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DhaPreauthDoctorDto)
  doctors: DhaPreauthDoctorDto[];
}

export class DhaAttachmentMetadataDto {
  @Type(() => Number) @IsInt() @Min(1) patientId: number;
  @Type(() => Number) @IsInt() @Min(1) consentAuthorizationId: number;
  @IsString() @IsNotEmpty() @MaxLength(80) interventionCode: string;
  @IsString() @IsNotEmpty() @MaxLength(80) documentType: string;
}

export class CreateDhaEmergencyClaimDto {
  @IsInt() @Min(1) patientId: number;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) interventions: string[];
  @IsIn(['AMBULANCE', 'WALK-IN', 'OTHER']) modeOfArrival: string;
  @IsIn(['RELATIVE', 'UNKNOWN', 'SAMARITAN', 'PARAMEDICS']) broughtBy: string;
  @IsString() @IsNotEmpty() @MaxLength(120) referenceNumber: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  practitionerIdentificationNumber: string;
  @IsIn(['registration_number', 'National ID', 'Alien ID', 'Refugee ID'])
  practitionerIdentificationType: string;
  @IsIn(['KMPDC', 'COC', 'NCK', 'PPB']) practitionerRegulationBody: string;
  @IsOptional() @IsString() @MaxLength(20) otp?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class SubmitLocalShaClaimDto {
  @IsInt() @Min(1) consentAuthorizationId: number;
  @IsString() @IsNotEmpty() @MaxLength(80) interventionCode: string;
  @IsIn(['CAPITATION', 'OUTPATIENT', 'INPATIENT']) serviceType: string;
  @IsOptional() @IsString() @MaxLength(20) visitOtp?: string;
  @ValidateIf((dto: SubmitLocalShaClaimDto) => dto.serviceType === 'INPATIENT')
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  dischargeOtp?: string;
}
