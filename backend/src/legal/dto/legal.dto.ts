import { IsString, IsNotEmpty, IsIn, MaxLength } from 'class-validator';

export class CreateOrUpdateLegalDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TERMS', 'PRIVACY', 'COOKIES'])
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  content: string;
}

export class AcceptLegalDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TERMS', 'PRIVACY', 'COOKIES'])
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;
}
