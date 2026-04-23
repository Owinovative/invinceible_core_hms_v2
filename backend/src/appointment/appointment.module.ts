import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientModule } from '../patient/patient.module';
import { StaffModule } from '../staff/staff.module';
import { FacilityModule } from '../facility/facility.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    PrismaModule,
    PatientModule,
    StaffModule,
    FacilityModule,
    AuthModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
