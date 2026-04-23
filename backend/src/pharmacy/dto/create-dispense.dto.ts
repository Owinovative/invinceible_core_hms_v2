import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDispenseItemDto {
  @IsInt()
  prescriptionItemId: number;

  @IsInt()
  medicineId: number;

  @IsInt()
  @Min(1)
  quantityDispensed: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDispenseDto {
  @IsInt()
  prescriptionId: number;

  @IsOptional()
  @IsInt()
  dispensedByStaffId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDispenseItemDto)
  items: CreateDispenseItemDto[];
}
