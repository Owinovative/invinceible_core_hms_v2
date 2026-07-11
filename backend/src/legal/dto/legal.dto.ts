import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateOrUpdateLegalDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TERMS', 'PRIVACY', 'COOKIES'])
  type: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AcceptLegalDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TERMS', 'PRIVACY', 'COOKIES'])
  type: string;

  @IsString()
  @IsNotEmpty()
  version: string;
}
