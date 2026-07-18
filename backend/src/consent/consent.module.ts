import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { IntegrationModule } from '../integration/integration.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [IntegrationModule, AuthModule],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
