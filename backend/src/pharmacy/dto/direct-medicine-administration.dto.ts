import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DirectMedicineAdministrationDto {
  @Type(() => Number)
  @IsInt()
  consultationId: number;

  @Type(() => Number)
  @IsInt()
  patientId: number;

  @Type(() => Number)
  @IsInt()
  medicineId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @IsIn(['DIRECT_DISPENSE', 'INJECTION'])
  mode: 'DIRECT_DISPENSE' | 'INJECTION';

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
  @MaxLength(100)
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
