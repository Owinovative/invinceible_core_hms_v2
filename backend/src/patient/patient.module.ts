import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { FacilityModule } from '../facility/facility.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FacilityModule, AuthModule],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
