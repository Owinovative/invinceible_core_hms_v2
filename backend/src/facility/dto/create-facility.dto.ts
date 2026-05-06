import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFacilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  branchCode?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  facilityType?: string;

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
  @IsString()
  @MaxLength(50)
  altPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

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
  registrationNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxPin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mapLocationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleMapsUrl?: string;

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
  @IsBoolean()
  mpesaEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mpesaEnvironment?: string;

  @IsOptional()
  @IsString()
  mpesaConsumerKey?: string;

  @IsOptional()
  @IsString()
  mpesaConsumerSecret?: string;

  @IsOptional()
  @IsString()
  mpesaPasskey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mpesaCallbackUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mpesaTransactionType?: string;

  @IsOptional()
  @IsBoolean()
  showCashOnInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  showPaybillOnInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  showTillOnInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  showPochiOnInvoice?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shaFidCode?: string;

  @IsOptional()
  @IsNumber()
  shaClaimStartNumber?: number;

  @IsOptional()
  @IsNumber()
  shaClaimNextNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  complianceStatus?: string;

  @IsOptional()
  @IsString()
  complianceReason?: string;

  @IsOptional()
  @IsBoolean()
  isHeadOffice?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
