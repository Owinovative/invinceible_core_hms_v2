import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ReviewMedicineReturnItemDto {
  @IsInt()
  itemId: number;

  @IsIn(['RESTOCK', 'WASTE', 'QUARANTINE'])
  dispositionCode: 'RESTOCK' | 'WASTE' | 'QUARANTINE';

  @IsOptional()
  @IsInt()
  medicineBatchId?: number;

  @IsOptional()
  @IsString()
  dispositionReason?: string;
}

export class ReviewMedicineReturnDto {
  @IsString()
  inspectionNotes: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReviewMedicineReturnItemDto)
  items: ReviewMedicineReturnItemDto[];
}
