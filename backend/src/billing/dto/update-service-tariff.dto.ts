import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateServiceTariffDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsInt()
  billingServiceId?: number | null;

  @IsOptional()
  @IsInt()
  labTestId?: number | null;

  @IsOptional()
  @IsInt()
  wardId?: number | null;

  @IsOptional()
  @IsInt()
  bedId?: number | null;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
