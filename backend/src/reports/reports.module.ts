import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ShaPerformanceService } from './sha-performance.service';
import { ReportsDocumentService } from './reports-document.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsDocumentService, ShaPerformanceService],
  exports: [ReportsService, ReportsDocumentService, ShaPerformanceService],
})
export class ReportsModule {}
