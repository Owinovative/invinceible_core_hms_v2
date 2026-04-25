import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { MasterCatalogController } from './master-catalog.controller';
import { MasterCatalogService } from './master-catalog.service';

@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [MasterCatalogController],
  providers: [MasterCatalogService],
  exports: [MasterCatalogService],
})
export class MasterCatalogModule {}
