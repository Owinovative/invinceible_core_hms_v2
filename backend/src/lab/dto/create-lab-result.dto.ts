import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateLabResultDto {
  @IsInt()
  orderItemId: number;

  @IsString()
  resultValue: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  attachmentFileName?: string;

  @IsOptional()
  @IsString()
  attachmentMimeType?: string;

  @IsOptional()
  @IsString()
  attachmentDataUrl?: string;

  @IsOptional()
  @IsInt()
  recordedBy?: number;
}
