import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PharmacyInventoryController } from './pharmacy-inventory.controller';
import { PharmacyInventoryService } from './pharmacy-inventory.service';

@Module({
  imports: [AuthModule],
  controllers: [PharmacyInventoryController],
  providers: [PharmacyInventoryService],
  exports: [PharmacyInventoryService],
})
export class PharmacyInventoryModule {}
