import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { RequestWithContext } from '../resilience/request-context.middleware';
import { CreatePayheroPaymentRequestDto } from './dto/create-payhero-payment-request.dto';
import { PayheroBillingService } from './payhero-billing.service';

@Controller('billing/payments/payhero')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PayheroBillingController {
  constructor(private readonly payheroBillingService: PayheroBillingService) {}

  @Post('request')
  @Permissions('payment.collect')
  createPayheroPaymentRequest(
    @Body() dto: CreatePayheroPaymentRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() request?: RequestWithContext,
  ) {
    return this.payheroBillingService.initiateInvoicePayment(
      dto,
      user,
      request?.requestId,
    );
  }

  @Get('status/:paymentId')
  @Permissions('payment.collect')
  getPayheroPaymentStatus(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payheroBillingService.getPaymentStatus(paymentId, user);
  }
}

@Controller('billing/payments/payhero')
export class PayheroCallbackController {
  constructor(private readonly payheroBillingService: PayheroBillingService) {}

  @Post('callback')
  handleCallback(@Body() payload: Record<string, unknown>) {
    return this.payheroBillingService.handleCallback(payload);
  }
}
