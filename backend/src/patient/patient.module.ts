import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { FacilityModule } from '../facility/facility.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [FacilityModule, AuthModule, IntegrationsModule, ConfigModule],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
