import { IsString, MinLength } from 'class-validator';

export class ImportMasterCatalogCsvDto {
  @IsString()
  @MinLength(3)
  csvText: string;
}
