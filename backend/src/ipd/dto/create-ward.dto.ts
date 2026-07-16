import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWardDto {
  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wardType?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
