import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateCashPaymentDto } from './dto/create-cash-payment.dto';
import { CreateMpesaPaymentRequestDto } from './dto/create-mpesa-payment-request.dto';
import { ConfirmMpesaPaymentDto } from './dto/confirm-mpesa-payment.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { RemoveInvoiceItemDto } from './dto/remove-invoice-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('billing')
@UseGuards(AuthGuard('jwt'))
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('services')
  createBillingService(@Body() dto: CreateBillingServiceDto) {
    return this.billingService.createBillingService(dto);
  }

  @Get('services')
  getAllBillingServices() {
    return this.billingService.getAllBillingServices();
  }

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @Get('invoices')
  getAllInvoices(@CurrentUser() user: RequestUser) {
    return this.billingService.getAllInvoicesScoped(user);
  }

  @Get('invoices/:id')
  getInvoiceById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getInvoiceByIdScoped(id, user);
  }

@Patch('invoice-items/:id')
updateInvoiceItem(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateInvoiceItemDto,
  @CurrentUser() user: RequestUser,
) {
  return this.billingService.updateInvoiceItem(id, dto, user);
}

@Patch('invoice-items/:id/remove')
removeInvoiceItem(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: RemoveInvoiceItemDto,
  @CurrentUser() user: RequestUser,
) {
  return this.billingService.removeInvoiceItem(id, dto);
}

  @Get('patient/:patientNumber')
  getPatientBillingByPatientNumber(
    @Param('patientNumber') patientNumber: string,
  ) {
    return this.billingService.getPatientBillingByPatientNumber(patientNumber);
  }

  @Post('payments/cash')
  createCashPayment(@Body() dto: CreateCashPaymentDto) {
    return this.billingService.createCashPayment(dto);
  }

  @Post('payments/mpesa/request')
  createMpesaPaymentRequest(@Body() dto: CreateMpesaPaymentRequestDto) {
    return this.billingService.createMpesaPaymentRequest(dto);
  }

  @Post('payments/mpesa/confirm')
  confirmMpesaPayment(@Body() dto: ConfirmMpesaPaymentDto) {
    return this.billingService.confirmMpesaPayment(dto);
  }

  @Patch('payments/mpesa/fail/:checkoutRequestId')
  failMpesaPayment(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @Body() body: { callbackPayload?: string },
  ) {
    return this.billingService.failMpesaPayment(
      checkoutRequestId,
      body?.callbackPayload,
    );
  }

  @Get('dashboard')
  getBillingDashboard() {
    return this.billingService.getBillingDashboard();
  }
}