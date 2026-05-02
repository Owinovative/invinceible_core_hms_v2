import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBranchDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  county?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  town?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  postalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mpesaShortcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mpesaPaybill?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mpesaAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mpesaTillNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mpesaPochiNumber?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mapLocationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleMapsUrl?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
