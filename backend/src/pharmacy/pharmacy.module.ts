import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { PatientModule } from '../patient/patient.module';
import { StaffModule } from '../staff/staff.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PatientModule,
    StaffModule,
    ConsultationModule,
    NotificationModule,
    AuthModule,
    BillingModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
