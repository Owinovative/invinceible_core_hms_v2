import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ShaPerformanceService } from './sha-performance.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ShaPerformanceService],
  exports: [ReportsService, ShaPerformanceService],
})
export class ReportsModule {}
