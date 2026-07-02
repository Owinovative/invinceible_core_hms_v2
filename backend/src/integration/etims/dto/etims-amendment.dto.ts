import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEtimsAmendmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  reason: string;

  /** Optional subset of invoice item ids for a partial credit/debit note. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds?: number[];
}

export class CancelEtimsInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  reason: string;
}
