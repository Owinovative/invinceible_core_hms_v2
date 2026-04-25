import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateServiceTariffDto {
  @IsString()
  @MaxLength(80)
  code: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(80)
  category: string;

  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  billingServiceId?: number;

  @IsOptional()
  @IsInt()
  labTestId?: number;

  @IsOptional()
  @IsInt()
  wardId?: number;

  @IsOptional()
  @IsInt()
  bedId?: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
