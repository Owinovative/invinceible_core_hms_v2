import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddInvoiceItemDto {
  @IsOptional()
  @IsIn(['SERVICE', 'LAB_TEST', 'MEDICINE', 'MANUAL'])
  chargeType?: 'SERVICE' | 'LAB_TEST' | 'MEDICINE' | 'MANUAL';

  @IsOptional()
  @IsInt()
  billingServiceId?: number;

  @IsOptional()
  @IsInt()
  labTestId?: number;

  @IsOptional()
  @IsInt()
  medicineId?: number;

  @IsOptional()
  @IsInt()
  branchMedicineStockId?: number;

  @IsOptional()
  @IsDateString()
  chargedAt?: string;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsInt()
  updatedByStaffId?: number;
}
