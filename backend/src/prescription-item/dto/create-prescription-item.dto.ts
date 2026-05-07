import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';


export class CreatePrescriptionItemDto {
  @IsInt()
  prescriptionId: number;


  @IsInt()
  medicineId: number;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string;


  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;


  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  stockStatusAtPrescribing?: string;

  @IsOptional()
  @IsInt()
  acceptedAlternativeForMedicineId?: number;


  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;
}
