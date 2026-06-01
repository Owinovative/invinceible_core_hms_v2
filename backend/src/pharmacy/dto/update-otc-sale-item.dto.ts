import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateOtcSaleItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
