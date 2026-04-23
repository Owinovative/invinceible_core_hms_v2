import { IsInt, IsOptional, IsString } from 'class-validator';

export class ResolveNotificationDto {
  @IsOptional()
  @IsInt()
  resolvedByUserId?: number;

  @IsOptional()
  @IsInt()
  resolvedByStaffId?: number;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}


