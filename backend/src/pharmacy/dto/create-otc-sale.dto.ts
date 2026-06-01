import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OtcSaleItemInputDto {
  @IsInt()
  medicineId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateOtcSaleDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtcSaleItemInputDto)
  items?: OtcSaleItemInputDto[];
}
