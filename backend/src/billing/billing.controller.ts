import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { BillingService } from './billing.service';
import { FacilityMpesaBillingService } from './facility-mpesa-billing.service';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateCashPaymentDto } from './dto/create-cash-payment.dto';
import { CreateMpesaPaymentRequestDto } from './dto/create-mpesa-payment-request.dto';
import { ConfirmMpesaPaymentDto } from './dto/confirm-mpesa-payment.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { RemoveInvoiceItemDto } from './dto/remove-invoice-item.dto';
import { CreateServiceTariffDto } from './dto/create-service-tariff.dto';
import { UpdateServiceTariffDto } from './dto/update-service-tariff.dto';
import { PostBedChargeDto } from './dto/post-bed-charge.dto';
import { ImportServiceTariffsCsvDto } from './dto/import-service-tariffs-csv.dto';
import { OpenPatientInvoiceDto } from './dto/open-patient-invoice.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { StepUpRequired } from '../auth/step-up.decorator';
import { StepUpGuard } from '../auth/step-up.guard';
import type { RequestWithContext } from '../resilience/request-context.middleware';
import type { PaginationQuery } from '../common/pagination/pagination';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, StepUpGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly facilityMpesaBillingService: FacilityMpesaBillingService,
  ) {}

  @Post('services')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  @Permissions('billing.write')
  createBillingService(@Body() dto: CreateBillingServiceDto) {
    return this.billingService.createBillingService(dto);
  }

  @Get('services')
  @Permissions('billing.read')
  getAllBillingServices() {
    return this.billingService.getAllBillingServices();
  }

  @Get('tariffs/pricing-template')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  @Permissions('billing.write')
  getServiceTariffPricingTemplate(
    @Query('facilityId') facilityId: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getServiceTariffPricingTemplate(
      Number(facilityId),
      branchId ? Number(branchId) : undefined,
      user,
    );
  }

  @Post('tariffs/pricing-import')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  @Permissions('billing.write')
  importServiceTariffs(
    @Body() dto: ImportServiceTariffsCsvDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.importServiceTariffs(dto, user);
  }

  @Post('tariffs')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  @Permissions('billing.write')
  createServiceTariff(
    @Body() dto: CreateServiceTariffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.createServiceTariff(dto, user);
  }

  @Get('tariffs')
  @Permissions('billing.read')
  getServiceTariffs(
    @Query() query: PaginationQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getServiceTariffs(user, query);
  }

  @Patch('tariffs/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  @Permissions('billing.write')
  updateServiceTariff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceTariffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.updateServiceTariff(id, dto, user);
  }

  @Post('invoices')
  @Permissions('billing.write')
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.createInvoice(dto, user);
  }

  @Post('patients/:id/open-invoice')
  @Permissions('billing.write')
  openPatientInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OpenPatientInvoiceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.openPatientInvoice(id, dto, user);
  }

  @Get('patients/:id/workspace')
  @Permissions('billing.read')
  getPatientBillingWorkspace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getPatientBillingWorkspace(id, user);
  }

  @Post('admissions/:id/bed-charge')
  @Permissions('billing.write')
  postAdmissionBedCharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostBedChargeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.billAdmissionBedDay(id, {
      chargedDate: dto.chargedDate ? new Date(dto.chargedDate) : undefined,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      notes: dto.notes,
      createdByStaffId: user.staffId ?? undefined,
    });
  }

  @Get('invoices')
  @Permissions('billing.read')
  getAllInvoices(@CurrentUser() user: RequestUser, @Query() query: any) {
    if (query?.page || query?.pageSize || query?.search) {
      return this.billingService.getInvoicesPageScoped(user, query);
    }

    return this.billingService.getAllInvoicesScoped(user);
  }

  @Get('invoices/:id/pdf')
  @Permissions('billing.read')
  async downloadInvoicePdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.billingService.getInvoicePdf(id, user);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }

  @Get('invoices/verify/public')
  verifyInvoicePublic(
    @Query('invoice') invoiceNumber: string,
    @Query('code') code: string,
  ) {
    return this.billingService.getVerifiedInvoice(invoiceNumber, code);
  }

  @Get('invoices/verify/public.pdf')
  async downloadVerifiedInvoicePdf(
    @Query('invoice') invoiceNumber: string,
    @Query('code') code: string,
    @Res() response: Response,
  ) {
    const pdf = await this.billingService.getVerifiedInvoicePdf(
      invoiceNumber,
      code,
    );

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }

  @Get('invoices/:id')
  @Permissions('billing.read')
  getInvoiceById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getInvoiceByIdScoped(id, user);
  }

  @Post('invoices/:id/items')
  @Permissions('billing.write')
  addInvoiceItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddInvoiceItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.addInvoiceItem(id, dto, user);
  }

  @Post('invoices/:id/close')
  @Permissions('billing.write')
  closeInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.closeInvoice(id, user);
  }

  @Patch('invoice-items/:id')
  @Permissions('billing.write')
  updateInvoiceItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.updateInvoiceItem(id, dto, user);
  }

  @Patch('invoice-items/:id/remove')
  @Permissions('billing.write')
  removeInvoiceItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RemoveInvoiceItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.removeInvoiceItem(id, dto, user);
  }

  @Get('patient/:patientNumber')
  @Permissions('billing.read')
  getPatientBillingByPatientNumber(
    @Param('patientNumber') patientNumber: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.getPatientBillingByPatientNumber(
      patientNumber,
      user,
    );
  }

  @Post('payments/cash')
  @Permissions('payment.collect')
  createCashPayment(
    @Body() dto: CreateCashPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.billingService.createCashPayment(dto, user);
  }

  @Get('payments/:id/receipt.pdf')
  @Permissions('billing.read')
  async downloadPaymentReceiptPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.billingService.getPaymentReceiptPdf(id, user);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }

  @Post('payments/mpesa/request')
  @Permissions('payment.collect')
  createMpesaPaymentRequest(
    @Body() dto: CreateMpesaPaymentRequestDto,
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Req() request?: RequestWithContext,
  ) {
    return this.facilityMpesaBillingService.createMpesaPaymentRequest(
      dto,
      user,
      request?.requestId,
    );
  }

  @Post('payments/:id/mpesa/resend')
  @Permissions('payment.collect')
  resendMpesaPaymentRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Req() request?: RequestWithContext,
  ) {
    return this.facilityMpesaBillingService.resendMpesaPaymentRequest(
      id,
      user,
      request?.requestId,
    );
  }

  @Post('payments/mpesa/confirm')
  confirmMpesaPayment(@Body() dto: ConfirmMpesaPaymentDto) {
    return this.facilityMpesaBillingService.confirmMpesaPayment(dto);
  }

  @Patch('payments/mpesa/fail/:checkoutRequestId')
  @Permissions('payment.manual_confirm')
  @StepUpRequired()
  failMpesaPayment(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @Body() body: { callbackPayload?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.facilityMpesaBillingService.failMpesaPayment(
      checkoutRequestId,
      body?.callbackPayload,
      user,
    );
  }

  @Get('payments/mpesa/status/:checkoutRequestId')
  @Permissions('payment.collect')
  getMpesaPaymentStatus(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.facilityMpesaBillingService.getMpesaPaymentStatus(
      checkoutRequestId,
      user,
    );
  }

  @Get('dashboard')
  @Permissions('billing.read')
  getBillingDashboard(@CurrentUser() user: RequestUser) {
    return this.billingService.getBillingDashboard(user);
  }

  @Get('revenue-integrity')
  @Permissions('reports.read')
  getRevenueIntegrity(@CurrentUser() user: RequestUser) {
    return this.billingService.getRevenueIntegrity(user);
  }

  @Get('cashier-close')
  @Permissions('reports.read')
  getCashierClose(
    @CurrentUser() user: RequestUser,
    @Query('date') date?: string,
  ) {
    return this.billingService.getCashierClose(user, date);
  }
}

@Controller('billing/payments/mpesa')
export class MpesaCallbackController {
  constructor(
    private readonly facilityMpesaBillingService: FacilityMpesaBillingService,
  ) {}

  @Post('callback')
  handleCallback(@Body() payload: unknown) {
    return this.facilityMpesaBillingService.handleMpesaCallback(payload);
  }
}

@Controller('billing-public')
export class BillingPublicController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices/verify')
  verifyInvoice(
    @Query('invoice') invoiceNumber: string,
    @Query('code') code: string,
  ) {
    return this.billingService.getVerifiedInvoice(invoiceNumber, code);
  }

  @Get('invoices/verify.pdf')
  async downloadInvoicePdf(
    @Query('invoice') invoiceNumber: string,
    @Query('code') code: string,
    @Res() response: Response,
  ) {
    const pdf = await this.billingService.getVerifiedInvoicePdf(
      invoiceNumber,
      code,
    );

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }
}
