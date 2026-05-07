import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(50)
  username: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsInt()
  homeFacilityId?: number;

  @IsOptional()
  @IsInt()
  homeBranchId?: number;

  @IsOptional()
  @IsBoolean()
  canAccessAllBranchesInFacility?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
