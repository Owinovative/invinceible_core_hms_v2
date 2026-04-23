import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateIpdDoctorReviewDto {
  @IsInt()
  admissionId: number;

  @IsOptional()
  @IsInt()
  reviewedByStaffId?: number;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
