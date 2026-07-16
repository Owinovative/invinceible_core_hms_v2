import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditLogModule, AuthModule],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
