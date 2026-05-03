import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RecordFacilitySubscriptionPaymentDto } from './dto/record-facility-subscription-payment.dto';
import { FacilitySubscriptionService } from './facility-subscription.service';

@Controller('facility-subscriptions')
@UseGuards(AuthGuard('jwt'))
export class FacilitySubscriptionController {
  constructor(
    private readonly facilitySubscriptionService: FacilitySubscriptionService,
  ) {}

  @Get('my-status')
  getMyStatus(@CurrentUser() user: RequestUser) {
    return this.facilitySubscriptionService.getMyStatus(user);
  }

  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  findPlatform() {
    return this.facilitySubscriptionService.findPlatform();
  }

  @Post('payments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  recordPayment(
    @Body() dto: RecordFacilitySubscriptionPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.facilitySubscriptionService.recordPayment(dto, user);
  }
}
