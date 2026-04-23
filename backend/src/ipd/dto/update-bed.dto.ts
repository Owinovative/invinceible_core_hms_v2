import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBedDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bedNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedLabel?: string;

  @IsOptional()
  @IsInt()
  wardId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
