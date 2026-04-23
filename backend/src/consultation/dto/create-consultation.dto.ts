import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateConsultationDto {
  @IsString()
  @MaxLength(50)
  consultationNumber: string;

  @IsInt()
  appointmentId: number;

  @IsInt()
  patientId: number;

  @IsInt()
  doctorId: number;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  historyOfPresenting?: string;

  @IsOptional()
  @IsString()
  examinationFindings?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;
}
