import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EvaluateClinicalSafetyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  ageYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(260)
  systolicBp?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(180)
  diastolicBp?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(45)
  temperatureC?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(260)
  pulse?: number;

  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsBoolean()
  pregnant?: boolean;

  @IsOptional()
  @IsString()
  allergyText?: string;

  @IsOptional()
  @IsString({ each: true })
  medicines?: string[];

  @IsOptional()
  @IsString({ each: true })
  labFlags?: string[];
}
