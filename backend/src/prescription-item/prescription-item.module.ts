import { Module } from '@nestjs/common';
import { PrescriptionItemController } from './prescription-item.controller';
import { PrescriptionItemService } from './prescription-item.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PrescriptionItemController],
  providers: [PrescriptionItemService],
  exports: [PrescriptionItemService],
})
export class PrescriptionItemModule {}
