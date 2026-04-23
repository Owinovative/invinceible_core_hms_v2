import { IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCashPaymentDto {
  @IsString()
  @MaxLength(50)
  receiptNumber: string;

  @IsInt()
  invoiceId: number;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsInt()
  receivedByStaffId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
