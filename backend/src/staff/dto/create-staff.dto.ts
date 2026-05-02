import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MaxLength(50)
  staffCode: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  designation?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nationalIdNumber: string;

  @IsOptional()
  @IsString()
  nationalIdImageUrl?: string;

  @IsOptional()
  @IsString()
  passportPhotoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clinicianRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  clinicianBoard?: string;

  @IsOptional()
  @IsBoolean()
  isClinician?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrescriber?: boolean;

  @IsOptional()
  @IsBoolean()
  canLogin?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsInt()
  userId?: number;
}
