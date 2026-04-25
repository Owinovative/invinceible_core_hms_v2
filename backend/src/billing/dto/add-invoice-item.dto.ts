import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddInvoiceItemDto {
  @IsOptional()
  @IsInt()
  billingServiceId?: number;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;

  @IsOptional()
  @IsInt()
  updatedByStaffId?: number;
}
