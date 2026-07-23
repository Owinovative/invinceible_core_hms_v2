import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMedicineReturnItemDto {
  @IsOptional()
  @IsInt()
  dispenseItemId?: number;

  @IsInt()
  medicineId: number;

  @IsOptional()
  @IsInt()
  medicineBatchId?: number;

  @IsInt()
  @Min(1)
  quantityReturned: number;

  @IsString()
  conditionCode: string;
}

export class CreateMedicineReturnDto {
  @IsInt()
  pharmacyLocationId: number;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  dispenseId?: number;

  @IsString()
  returnReason: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMedicineReturnItemDto)
  items: CreateMedicineReturnItemDto[];
}
