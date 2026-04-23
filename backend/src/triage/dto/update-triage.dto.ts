import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTriageDto {
  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsOptional()
  @IsInt()
  performedByStaffId?: number;

  @IsOptional()
  @IsInt()
  routedDoctorId?: number;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  systolicBp?: number;

  @IsOptional()
  @IsInt()
  diastolicBp?: number;

  @IsOptional()
  @IsInt()
  pulseRate?: number;

  @IsOptional()
  @IsInt()
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  triagePriority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
