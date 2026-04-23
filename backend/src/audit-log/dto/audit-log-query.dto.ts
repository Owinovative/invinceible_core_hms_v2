import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  moduleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;
}
