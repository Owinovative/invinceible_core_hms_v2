import { Module, forwardRef } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { FacilityModule } from '../facility/facility.module';
import { BranchModule } from '../branch/branch.module';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [
    FacilityModule,
    forwardRef(() => BranchModule),
    DepartmentModule,
  ],
  controllers: [ClinicController],
  providers: [ClinicService],
  exports: [ClinicService],
})
export class ClinicModule {}
