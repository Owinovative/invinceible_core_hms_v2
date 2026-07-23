import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInsurancePayerDto {
  @IsInt()
  facilityId: number;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  payerType?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  integrationBaseUrl?: string;

  @IsOptional()
  @IsString()
  eligibilityPath?: string;

  @IsOptional()
  @IsString()
  claimSubmissionPath?: string;

  @IsOptional()
  @IsString()
  apiToken?: string;
}

export class CreatePatientInsurancePolicyDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsInt()
  patientId: number;

  @IsInt()
  insurancePayerId: number;

  @IsString()
  policyNumber: string;

  @IsOptional()
  @IsString()
  memberNumber?: string;

  @IsOptional()
  @IsString()
  principalMemberName?: string;

  @IsOptional()
  @IsString()
  relationshipToPrincipal?: string;

  @IsOptional()
  @IsDateString()
  coverStartAt?: string;

  @IsOptional()
  @IsDateString()
  coverEndAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  benefitLimit?: number;
}

export class CreatePrivateInsuranceClaimDto {
  @IsInt()
  patientInsurancePolicyId: number;

  @IsInt()
  invoiceId: number;
}
