import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIpdProgressNoteDto {
  @IsInt()
  admissionId: number;

  @IsOptional()
  @IsInt()
  recordedByStaffId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  noteType?: string;

  @IsString()
  noteText: string;
}
