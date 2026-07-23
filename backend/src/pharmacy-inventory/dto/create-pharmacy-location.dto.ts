import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePharmacyLocationDto {
  @IsInt()
  facilityId: number;

  @IsInt()
  branchId: number;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  locationType?: string;

  @IsOptional()
  @IsBoolean()
  isDispensingLocation?: boolean;
}
