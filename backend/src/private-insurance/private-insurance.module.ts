import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integration/integration.module';
import { PrivateInsuranceController } from './private-insurance.controller';
import { PrivateInsuranceService } from './private-insurance.service';

@Module({
  imports: [AuthModule, IntegrationModule],
  controllers: [PrivateInsuranceController],
  providers: [PrivateInsuranceService],
})
export class PrivateInsuranceModule {}
