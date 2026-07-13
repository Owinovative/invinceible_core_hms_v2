import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class GetContactsDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;
}

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  interventionCodes: string[];

  @IsNumber()
  @IsNotEmpty()
  contactId: number;
}

export enum ServiceType {
  INPATIENT = 'INPATIENT',
  OUTPATIENT = 'OUTPATIENT',
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  interventionCodes: string[];

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @IsNumber()
  @IsOptional()
  consultationId?: number; // To link the consent token directly to a consultation
}

export class SendDischargeOtpDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsNumber()
  @IsNotEmpty()
  contactId: number;

  @IsString()
  @IsNotEmpty()
  encounterId: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;
}
