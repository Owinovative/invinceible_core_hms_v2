import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DoctorLabReviewService } from './doctor-lab-review.service';

@Controller('doctor-lab-review')
export class DoctorLabReviewController {
  constructor(
    private readonly doctorLabReviewService: DoctorLabReviewService,
  ) {}

  @Get('appointment/:appointmentId')
  getOrdersByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.doctorLabReviewService.getOrdersByAppointment(appointmentId);
  }

  @Get('order/:orderId')
  getSingleOrderReview(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.doctorLabReviewService.getSingleOrderReview(orderId);
  }

  @Get('doctor/:doctorId')
  getDoctorPendingReviews(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.doctorLabReviewService.getDoctorPendingReviews(doctorId);
  }
}
