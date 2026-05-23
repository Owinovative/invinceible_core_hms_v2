import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ImportServiceTariffsCsvDto {
  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000)
  csvText: string;
}
