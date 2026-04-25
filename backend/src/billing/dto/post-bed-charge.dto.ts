import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class PostBedChargeDto {
  @IsOptional()
  @IsDateString()
  chargedDate?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
