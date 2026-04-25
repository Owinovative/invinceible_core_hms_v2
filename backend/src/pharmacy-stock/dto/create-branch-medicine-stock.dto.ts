import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateBranchMedicineStockDto {
  @IsInt()
  facilityId: number;

  @IsInt()
  branchId: number;

  @IsInt()
  medicineId: number;

  @IsOptional()
  @IsInt()
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  reorderLevel?: number;

  @IsOptional()
  @IsNumber()
  buyingPrice?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 
