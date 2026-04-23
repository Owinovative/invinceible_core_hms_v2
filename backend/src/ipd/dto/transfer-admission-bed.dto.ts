import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransferAdmissionBedDto {
  @IsInt()
  wardId: number;

  @IsOptional()
  @IsInt()
  bedId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
