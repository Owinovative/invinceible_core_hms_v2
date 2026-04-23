import { IsInt, IsOptional, IsString } from 'class-validator';

export class RemoveInvoiceItemDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  updatedByStaffId?: number;
}
