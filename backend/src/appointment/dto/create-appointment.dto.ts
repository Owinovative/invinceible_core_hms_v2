import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';


export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appointmentNumber?: string;


  @IsDateString()
  appointmentDate: string;


  @IsInt()
  patientId: number;


  @IsOptional()
  @IsInt()
  doctorId?: number;


  @IsOptional()
  @IsInt()
  clinicId?: number;


  @IsOptional()
  @IsString()
  @MaxLength(20)
  startTime?: string;


  @IsOptional()
  @IsString()
  @MaxLength(20)
  endTime?: string;


  @IsOptional()
  @IsString()
  visitReason?: string;


  @IsOptional()
  @IsString()
  @MaxLength(50)
  statusCode?: string;


  @IsOptional()
  @IsString()
  @MaxLength(30)
  triagePriority?: string;


  @IsOptional()
  @IsString()
  notes?: string;
}
