import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLabOrderItemDto {
  @IsInt()
  testId: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateLabOrderDto {
  @IsOptional()
  @IsNotEmpty()
  orderNumber: string;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsOptional()
  @IsInt()
  admissionId?: number;

  @IsOptional()
  @IsString()
  encounterRef?: string;

  @IsOptional()
  @IsInt()
  requestedByStaffId?: number;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabOrderItemDto)
  items: CreateLabOrderItemDto[];
}
