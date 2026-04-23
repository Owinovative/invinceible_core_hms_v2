import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmMpesaPaymentDto {
  @IsString()
  @MaxLength(100)
  checkoutRequestId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantRequestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mpesaReceiptNumber?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  callbackPayload?: string;
}
