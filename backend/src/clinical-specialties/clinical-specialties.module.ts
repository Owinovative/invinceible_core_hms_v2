import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ClinicalSpecialtiesController } from './clinical-specialties.controller';
import { ClinicalSpecialtiesService } from './clinical-specialties.service';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [ClinicalSpecialtiesController],
  providers: [ClinicalSpecialtiesService],
})
export class ClinicalSpecialtiesModule {}
