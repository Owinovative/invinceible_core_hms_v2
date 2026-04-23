import { Module, forwardRef } from '@nestjs/common';
import { PharmacyStockService } from './pharmacy-stock.service';
import { PharmacyStockController } from './pharmacy-stock.controller';
import { FacilityModule } from '../facility/facility.module';
import { BranchModule } from '../branch/branch.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FacilityModule, forwardRef(() => BranchModule), AuthModule],
  controllers: [PharmacyStockController],
  providers: [PharmacyStockService],
  exports: [PharmacyStockService],
})
export class PharmacyStockModule {}
