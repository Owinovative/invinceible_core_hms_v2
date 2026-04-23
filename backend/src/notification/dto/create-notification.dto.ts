import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  notificationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  moduleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  targetUserId?: number;

  @IsOptional()
  @IsInt()
  targetStaffId?: number;
}
