import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class SetUserHomeBranchDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  homeFacilityId?: number;

  @IsOptional()
  @IsInt()
  homeBranchId?: number;

  @IsOptional()
  @IsBoolean()
  canAccessAllBranchesInFacility?: boolean;
}
