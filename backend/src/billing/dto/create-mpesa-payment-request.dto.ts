import { IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMpesaPaymentRequestDto {
  @IsString()
  @MaxLength(50)
  receiptNumber: string;

  @IsInt()
  invoiceId: number;

  @IsNumber()
  amount: number;

  @IsString()
  @MaxLength(30)
  phoneNumber: string;

  @IsOptional()
  @IsInt()
  receivedByStaffId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
