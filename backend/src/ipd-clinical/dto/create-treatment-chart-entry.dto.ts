import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTreatmentChartEntryDto {
  @IsInt()
  admissionId: number;

  @IsOptional()
  @IsInt()
  orderedByStaffId?: number;

  @IsOptional()
  @IsInt()
  administeredByStaffId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  treatmentType?: string;

  @IsString()
  @MaxLength(150)
  treatmentName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
