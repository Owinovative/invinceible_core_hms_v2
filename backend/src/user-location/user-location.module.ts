import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UserLocationController } from './user-location.controller';
import { UserLocationService } from './user-location.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [UserLocationController],
  providers: [UserLocationService],
  exports: [UserLocationService],
})
export class UserLocationModule {}
