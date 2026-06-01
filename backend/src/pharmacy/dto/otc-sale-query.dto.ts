import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { PaginationQuery } from '../../common/pagination/pagination';

export class OtcMedicineSearchQueryDto implements PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @IsOptional()
  page?: string | number;

  @IsOptional()
  pageSize?: string | number;
}

export class OtcSaleListQueryDto implements PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  page?: string | number;

  @IsOptional()
  pageSize?: string | number;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortDirection?: string;
}
