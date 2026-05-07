import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdministerIpdMedicineDto {
  @Type(() => Number)
  @IsInt()
  medicineId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
