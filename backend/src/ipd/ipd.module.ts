import { Module } from '@nestjs/common';
import { IpdService } from './ipd.service';
import { IpdController } from './ipd.controller';
import { PatientModule } from '../patient/patient.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PatientModule,
    AppointmentModule,
    ConsultationModule,
    StaffModule,
    NotificationModule,
    AuthModule,
    BillingModule,
  ],
  controllers: [IpdController],
  providers: [IpdService],
  exports: [IpdService],
})
export class IpdModule {}
