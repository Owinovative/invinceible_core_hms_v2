import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RestockBranchMedicineDto {
  @IsInt()
  @Min(1)
  quantityToAdd: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buyingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
