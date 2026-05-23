import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportBranchPricingCsvDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000)
  csvText: string;
}
