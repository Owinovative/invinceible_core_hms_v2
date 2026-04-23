import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClinicDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(50)
  clinicType: string;

  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsInt()
  departmentId: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  roomLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneExtension?: string;

  @IsOptional()
  @IsInt()
  consultationMinutes?: number;

  @IsOptional()
  @IsInt()
  maxDailyCapacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  serviceStartTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  serviceEndTime?: string;

  @IsOptional()
  @IsBoolean()
  isWalkInAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  isReferralRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
