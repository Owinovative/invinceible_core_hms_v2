import { Module, forwardRef } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { FacilityModule } from '../facility/facility.module';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [FacilityModule, forwardRef(() => BranchModule)],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
