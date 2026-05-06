import { Global, Module } from '@nestjs/common';
import { EnterpriseController } from './enterprise.controller';
import { EnterpriseService } from './enterprise.service';
import { FeatureFlagService } from './feature-flag.service';

@Global()
@Module({
  controllers: [EnterpriseController],
  providers: [EnterpriseService, FeatureFlagService],
  exports: [FeatureFlagService, EnterpriseService],
})
export class EnterpriseModule {}
