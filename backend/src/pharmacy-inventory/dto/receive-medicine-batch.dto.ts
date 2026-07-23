import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveMedicineBatchDto {
  @IsInt()
  pharmacyLocationId: number;

  @IsInt()
  medicineId: number;

  @IsString()
  @MaxLength(100)
  batchNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  manufacturerName?: string;

  @IsOptional()
  @IsDateString()
  manufacturedAt?: string;

  @IsDateString()
  expiresAt: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
