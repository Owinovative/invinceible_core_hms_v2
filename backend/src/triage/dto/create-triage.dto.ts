import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateTriageDto {
  @IsInt()
  patientId: number;

  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

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
  @MaxLength(30)
  arrivalType?: string;

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
