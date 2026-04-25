import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class ImportServiceTariffsCsvDto {
  @IsInt()
  facilityId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsString()
  @MinLength(1)
  csvText: string;
}
