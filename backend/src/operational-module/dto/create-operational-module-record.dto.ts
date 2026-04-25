import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOperationalModuleRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  moduleTitle?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  workflowStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priorityCode?: string;

  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsInt()
  assignedStaffId?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
