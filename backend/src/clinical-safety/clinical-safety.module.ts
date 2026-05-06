import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClinicalSafetyController } from './clinical-safety.controller';
import { ClinicalSafetyService } from './clinical-safety.service';

@Module({
  imports: [AuthModule],
  controllers: [ClinicalSafetyController],
  providers: [ClinicalSafetyService],
  exports: [ClinicalSafetyService],
})
export class ClinicalSafetyModule {}
