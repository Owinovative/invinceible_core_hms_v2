import { Module, forwardRef } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { FacilityModule } from '../facility/facility.module';
import { BranchModule } from '../branch/branch.module';
import { DepartmentModule } from '../department/department.module';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    FacilityModule,
    forwardRef(() => BranchModule),
    DepartmentModule,
    RoleModule,
    UserModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
