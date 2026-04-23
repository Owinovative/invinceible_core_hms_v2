import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { UserModule } from '../user/user.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [UserModule, StaffModule, NotificationModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
