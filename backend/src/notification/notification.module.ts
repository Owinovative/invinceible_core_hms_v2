import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UserModule } from '../user/user.module';
import { StaffModule } from '../staff/staff.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UserModule, StaffModule, AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
