import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { AuthModule } from '../auth/auth.module';
import { CommunicationController } from './communication.controller';
import { CommunicationSchedulerService } from './communication-scheduler.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationSchedulerService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
