import { Module } from '@nestjs/common';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientModule } from '../patient/patient.module';
import { StaffModule } from '../staff/staff.module';
import { FacilityModule } from '../facility/facility.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    PrismaModule,
    PatientModule,
    StaffModule,
    FacilityModule,
    AppointmentModule,
    AuthModule,
  ],
  controllers: [TriageController],
  providers: [TriageService],
  exports: [TriageService],
})
export class TriageModule {}
