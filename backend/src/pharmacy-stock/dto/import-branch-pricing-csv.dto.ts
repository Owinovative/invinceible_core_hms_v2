import { IsString, MinLength } from 'class-validator';

export class ImportBranchPricingCsvDto {
  @IsString()
  @MinLength(1)
  csvText: string;
}
