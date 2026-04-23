import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';


export class CreatePrescriptionDto {
  @IsInt()
  consultationId: number;


  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;


  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;
}
