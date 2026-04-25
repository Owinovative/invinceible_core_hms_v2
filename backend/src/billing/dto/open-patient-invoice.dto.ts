import { IsInt, IsOptional } from 'class-validator';

export class OpenPatientInvoiceDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  createdByStaffId?: number;
}
