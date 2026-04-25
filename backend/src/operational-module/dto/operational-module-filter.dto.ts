import { IsDateString, IsOptional, IsString } from 'class-validator';

export class OperationalModuleFilterDto {
  @IsOptional()
  @IsString()
  statusCode?: string;

  @IsOptional()
  @IsString()
  priorityCode?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
