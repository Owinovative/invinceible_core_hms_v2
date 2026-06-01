import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportMasterCatalogCsvDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1_000_000)
  csvText: string;
}
