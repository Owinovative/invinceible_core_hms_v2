import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { OtcSalesController } from './otc-sales.controller';
import { OtcSalesService } from './otc-sales.service';
import { PatientModule } from '../patient/patient.module';
import { StaffModule } from '../staff/staff.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    PatientModule,
    StaffModule,
    ConsultationModule,
    NotificationModule,
    AuthModule,
    BillingModule,
    AuditLogModule,
  ],
  controllers: [PharmacyController, OtcSalesController],
  providers: [PharmacyService, OtcSalesService],
  exports: [PharmacyService, OtcSalesService],
})
export class PharmacyModule {}
