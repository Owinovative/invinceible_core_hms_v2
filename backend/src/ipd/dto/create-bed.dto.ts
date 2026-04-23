import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBedDto {
  @IsString()
  @MaxLength(50)
  bedNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedLabel?: string;

  @IsInt()
  wardId: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
