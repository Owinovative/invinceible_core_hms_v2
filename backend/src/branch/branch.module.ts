import { Module, forwardRef } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { FacilityModule } from '../facility/facility.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [FacilityModule, forwardRef(() => UserModule)],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
