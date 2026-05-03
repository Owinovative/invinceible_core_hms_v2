import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { FacilitySubscriptionController } from './facility-subscription.controller';
import { FacilitySubscriptionService } from './facility-subscription.service';

@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [FacilitySubscriptionController],
  providers: [FacilitySubscriptionService],
  exports: [FacilitySubscriptionService],
})
export class FacilitySubscriptionModule {}
