import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class PossibleDuplicatePatientDto {
  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsString()
  patientNumber?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phonePrimary?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
