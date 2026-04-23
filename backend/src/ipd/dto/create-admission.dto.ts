import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAdmissionDto {
  @IsString()
  @MaxLength(50)
  admissionNumber: string;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsOptional()
  @IsInt()
  admittedByStaffId?: number;

  @IsInt()
  wardId: number;

  @IsOptional()
  @IsInt()
  bedId?: number;

  @IsOptional()
  @IsString()
  admissionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  admissionSource?: string;

  @IsOptional()
  @IsDateString()
  expectedDischargeAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
