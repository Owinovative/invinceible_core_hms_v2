import { Module } from '@nestjs/common';
import { DataOutboxService } from './data-outbox.service';

@Module({
  providers: [DataOutboxService],
  exports: [DataOutboxService],
})
export class DataOutboxModule {}
