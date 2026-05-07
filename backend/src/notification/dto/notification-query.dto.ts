import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  moduleName?: string;

  @IsOptional()
  @IsString()
  notificationType?: string;

  @IsOptional()
  @IsString()
  isRead?: string;

  @IsOptional()
  @IsString()
  isResolved?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;
}
