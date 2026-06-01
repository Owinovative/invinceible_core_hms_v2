import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePayheroPaymentRequestDto {
  @IsInt()
  invoiceId: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MaxLength(30)
  phoneNumber: string;

  @IsOptional()
  @IsInt()
  receivedByStaffId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  forceResend?: boolean;
}
