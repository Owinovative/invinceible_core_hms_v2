import { IsArray, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDhaClaimWorkflowDto {
  @IsInt()
  patientId: number;

  @IsString()
  @IsIn(['INPATIENT', 'OUTPATIENT'])
  serviceType: 'INPATIENT' | 'OUTPATIENT';

  @IsArray()
  @IsString({ each: true })
  interventionCodes: string[];

  @IsOptional()
  @IsInt()
  shaClaimId?: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;
}

export class DhaWorkflowActionDto {
  @IsObject()
  payload: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey: string;
}

export class StageDhaWorkflowAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType: string;
}
