import { Module } from '@nestjs/common';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [PrismaModule, ConsultationModule, AuthModule],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
