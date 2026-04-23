import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @MaxLength(100)
  moduleName: string;

  @IsString()
  @MaxLength(100)
  actionName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  actorUserId?: number;

  @IsOptional()
  @IsInt()
  actorStaffId?: number;

  @IsOptional()
  @IsString()
  beforeData?: string;

  @IsOptional()
  @IsString()
  afterData?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
