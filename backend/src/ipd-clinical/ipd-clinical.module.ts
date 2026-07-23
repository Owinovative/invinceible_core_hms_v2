import { Module } from '@nestjs/common';
import { IpdClinicalService } from './ipd-clinical.service';
import { IpdClinicalController } from './ipd-clinical.controller';
import { IpdModule } from '../ipd/ipd.module';
import { StaffModule } from '../staff/staff.module';
import { AuthModule } from '../auth/auth.module';
import { PharmacyInventoryModule } from '../pharmacy-inventory/pharmacy-inventory.module';

@Module({
  imports: [IpdModule, StaffModule, AuthModule, PharmacyInventoryModule],
  controllers: [IpdClinicalController],
  providers: [IpdClinicalService],
  exports: [IpdClinicalService],
})
export class IpdClinicalModule {}
