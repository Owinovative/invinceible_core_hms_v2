import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class GrantUserBranchAccessDto {
  @IsInt()
  userId: number;

  @IsInt()
  facilityId: number;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
