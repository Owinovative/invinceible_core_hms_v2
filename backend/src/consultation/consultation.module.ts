import { Module } from '@nestjs/common';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { PatientModule } from '../patient/patient.module';
import { StaffModule } from '../staff/staff.module';
import { FacilityModule } from '../facility/facility.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AppointmentModule,
    PatientModule,
    StaffModule,
    FacilityModule,
    AuthModule,
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService],
  exports: [ConsultationService],
})
export class ConsultationModule {}
