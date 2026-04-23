import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @MaxLength(100)
  settingKey: string;

  @IsString()
  settingValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  valueType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
