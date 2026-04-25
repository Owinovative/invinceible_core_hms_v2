import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OperationalModuleController } from './operational-module.controller';
import { OperationalModuleService } from './operational-module.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OperationalModuleController],
  providers: [OperationalModuleService],
  exports: [OperationalModuleService],
})
export class OperationalModuleModule {}
