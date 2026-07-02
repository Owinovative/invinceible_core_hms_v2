import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { FacilityMpesaBillingService } from './facility-mpesa-billing.service';
import { PayheroBillingService } from './payhero-billing.service';
import {
  BillingController,
  BillingPublicController,
  MpesaCallbackController,
} from './billing.controller';
import {
  PayheroBillingController,
  PayheroCallbackController,
} from './payhero.controller';
import { PatientModule } from '../patient/patient.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { StaffModule } from '../staff/staff.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [
    PatientModule,
    AppointmentModule,
    ConsultationModule,
    StaffModule,
    AuditLogModule,
    NotificationModule,
    AuthModule,
    IntegrationModule,
  ],
  controllers: [
    BillingController,
    MpesaCallbackController,
    PayheroBillingController,
    PayheroCallbackController,
    BillingPublicController,
  ],
  providers: [BillingService, FacilityMpesaBillingService, PayheroBillingService],
  exports: [BillingService, FacilityMpesaBillingService, PayheroBillingService],
})
export class BillingModule {}
