import { Module } from '@nestjs/common';
import { DoctorLabReviewService } from './doctor-lab-review.service';
import { DoctorLabReviewController } from './doctor-lab-review.controller';

@Module({
  controllers: [DoctorLabReviewController],
  providers: [DoctorLabReviewService],
  exports: [DoctorLabReviewService],
})
export class DoctorLabReviewModule {}
