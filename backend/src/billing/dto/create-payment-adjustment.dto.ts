import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentAdjustmentDto {
  @IsIn(['REFUND', 'REVERSAL'])
  adjustmentType: 'REFUND' | 'REVERSAL';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;
}
