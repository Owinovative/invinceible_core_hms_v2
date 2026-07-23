import { IsOptional, IsString } from 'class-validator';

export class ValidateLabResultDto {
  @IsOptional()
  @IsString()
  validationNotes?: string;
}

export class AmendLabResultDto {
  @IsString()
  resultValue: string;

  @IsString()
  amendmentReason: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
