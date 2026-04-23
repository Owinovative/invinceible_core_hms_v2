import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabTestDto {
  @IsString()
  @MaxLength(150)
  testName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specimenType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
