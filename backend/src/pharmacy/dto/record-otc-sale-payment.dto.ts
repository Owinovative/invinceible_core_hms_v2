import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const OTC_PAYMENT_METHODS = [
  'CASH',
  'MPESA_MANUAL',
  'MPESA_STK',
  'CARD',
  'BANK',
  'INSURANCE',
] as const;

export const INSURANCE_CLAIM_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'PAID',
  'CANCELLED',
] as const;

export class OtcSalePaymentInputDto {
  @IsIn(OTC_PAYMENT_METHODS)
  paymentMethod: (typeof OTC_PAYMENT_METHODS)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mpesaReceiptNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantRequestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  checkoutRequestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  insuranceProviderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  insuranceSchemeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  insuranceMemberNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  principalMemberName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  relationshipToPrincipal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorizationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  policyNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCoveredAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  patientCoPayAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  insuranceClaimReference?: string;

  @IsOptional()
  @IsIn(INSURANCE_CLAIM_STATUSES)
  insuranceClaimStatus?: (typeof INSURANCE_CLAIM_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RecordOtcSalePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtcSalePaymentInputDto)
  payments: OtcSalePaymentInputDto[];
}
