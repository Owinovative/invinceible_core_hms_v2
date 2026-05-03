import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  BillingController,
  BillingPublicController,
  MpesaCallbackController,
} from './billing.controller';
import { PatientModule } from '../patient/patient.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { StaffModule } from '../staff/staff.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PatientModule,
    AppointmentModule,
    ConsultationModule,
    StaffModule,
    AuditLogModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [BillingController, MpesaCallbackController, BillingPublicController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
