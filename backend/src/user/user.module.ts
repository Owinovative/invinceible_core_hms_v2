import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RoleModule } from '../role/role.module';
import { FacilityModule } from '../facility/facility.module';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [RoleModule, FacilityModule, forwardRef(() => BranchModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
