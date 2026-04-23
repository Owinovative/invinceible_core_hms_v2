import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIpdVitalRecordDto {
  @IsInt()
  admissionId: number;

  @IsOptional()
  @IsInt()
  recordedByStaffId?: number;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

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
  @IsNumber()
  bmi?: number;

  @IsOptional()
  @IsInt()
  painScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
