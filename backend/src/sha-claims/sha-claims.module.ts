import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ShaClaimsController } from './sha-claims.controller';
import { ShaClaimsService } from './sha-claims.service';

@Module({
  imports: [AuditLogModule, AuthModule, BillingModule],
  controllers: [ShaClaimsController],
  providers: [ShaClaimsService],
  exports: [ShaClaimsService],
})
export class ShaClaimsModule {}
