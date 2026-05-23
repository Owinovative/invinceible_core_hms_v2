import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import { serializeMaybeJsonCompact } from '../common/storage/compact-payload';
import { CreatePayheroPaymentRequestDto } from './dto/create-payhero-payment-request.dto';

type PayheroInitiateResponse = Record<string, unknown> & {
  success?: boolean;
  status?: string;
  status_code?: string | number;
  message?: string;
  reference?: string;
  request_id?: string;
  checkout_request_id?: string;
  CheckoutRequestID?: string;
  merchant_request_id?: string;
  MerchantRequestID?: string;
  external_reference?: string;
};

type PayheroCallbackPayload = Record<string, unknown>;

@Injectable()
export class PayheroBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  private isEnabled() {
    return String(process.env.PAYHERO_ENABLED ?? 'false').toLowerCase() === 'true';
  }

  private baseUrl() {
    return (process.env.PAYHERO_BASE_URL ?? 'https://backend.payhero.co.ke').replace(/\/$/, '');
  }

  private stkPushUrl() {
    return (
      process.env.PAYHERO_STK_PUSH_URL ??
      `${this.baseUrl()}/api/v2/payments`
    );
  }

  private requestTimeoutMs() {
    return Number(process.env.PAYHERO_REQUEST_TIMEOUT_MS ?? 15000);
  }

  private callbackUrl() {
    return process.env.PAYHERO_CALLBACK_URL;
  }

  private channelId() {
    return process.env.PAYHERO_CHANNEL_ID;
  }

  private compactPayload(value: unknown) {
    return serializeMaybeJsonCompact(value, {
      maxBytes: 3000,
      maxStringLength: 600,
      maxArrayItems: 20,
    });
  }

  private normalizePhoneNumber(value: string) {
    const digits = value.replace(/\D/g, '');

    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    if (digits.length === 9) return `254${digits}`;

    throw new BadRequestException('Enter a valid Kenyan phone number for PayHero STK push');
  }

  private maskPhone(phoneNumber: string) {
    if (phoneNumber.length < 7) return '[MASKED]';
    return `${phoneNumber.slice(0, 5)}***${phoneNumber.slice(-3)}`;
  }

  private buildAuthHeader() {
    const authMode = (process.env.PAYHERO_AUTH_MODE ?? 'basic').toLowerCase();
    const apiKey = process.env.PAYHERO_API_KEY ?? process.env.PAYHERO_USERNAME;
    const apiSecret = process.env.PAYHERO_API_SECRET ?? process.env.PAYHERO_PASSWORD;
    const bearerToken = process.env.PAYHERO_BEARER_TOKEN;

    if (authMode === 'bearer') {
      if (!bearerToken && !apiKey) {
        throw new ServiceUnavailableException('PayHero bearer token is not configured');
      }
      return `Bearer ${bearerToken ?? apiKey}`;
    }

    if (!apiKey || !apiSecret) {
      throw new ServiceUnavailableException('PayHero API credentials are not configured');
    }

    return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs());

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('PayHero timed out. Retry shortly.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildProviderReference(payload: Record<string, unknown>) {
    const candidates = [
      payload.reference,
      payload.request_id,
      payload.checkout_request_id,
      payload.CheckoutRequestID,
      payload.merchant_request_id,
      payload.MerchantRequestID,
      payload.external_reference,
      payload.transaction_reference,
      payload.TransactionReference,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }

    return undefined;
  }

  private callbackStatus(payload: PayheroCallbackPayload) {
    const rawStatus = String(
      payload.status ??
        payload.Status ??
        payload.result_code ??
        payload.ResultCode ??
        payload.response_code ??
        payload.ResponseCode ??
        '',
    ).toUpperCase();

    if (['SUCCESS', 'COMPLETED', 'PAID', '0', '200'].includes(rawStatus)) {
      return 'COMPLETED';
    }

    if (['PENDING', 'QUEUED', 'PROCESSING'].includes(rawStatus)) {
      return 'PENDING';
    }

    if (['CANCELLED', 'CANCELED'].includes(rawStatus)) return 'CANCELLED';
    return 'FAILED';
  }

  private callbackAmount(payload: PayheroCallbackPayload) {
    const raw =
      payload.amount ??
      payload.Amount ??
      payload.trans_amount ??
      payload.TransAmount ??
      payload.paid_amount;
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : undefined;
  }

  private callbackPhone(payload: PayheroCallbackPayload) {
    const raw =
      payload.phone_number ??
      payload.phoneNumber ??
      payload.PhoneNumber ??
      payload.msisdn ??
      payload.MSISDN;
    return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : undefined;
  }

  private callbackReceipt(payload: PayheroCallbackPayload) {
    const raw =
      payload.mpesa_receipt_number ??
      payload.MpesaReceiptNumber ??
      payload.receipt_number ??
      payload.ReceiptNumber ??
      payload.transaction_reference ??
      payload.TransactionReference;
    return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : undefined;
  }

  async initiateInvoicePayment(
    dto: CreatePayheroPaymentRequestDto,
    user: RequestUser,
    requestId?: string,
  ) {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('PayHero payments are not enabled');
    }

    const callbackUrl = this.callbackUrl();
    const channelId = this.channelId();

    if (!callbackUrl) {
      throw new ServiceUnavailableException('PAYHERO_CALLBACK_URL is not configured');
    }
    if (!channelId) {
      throw new ServiceUnavailableException('PAYHERO_CHANNEL_ID is not configured');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { patient: true, facility: true, branch: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${dto.invoiceId} not found`);
    }

    this.scopeService.assertBranchAccess(user, invoice.facilityId, invoice.branchId);

    if (dto.amount <= 0) {
      throw new BadRequestException('PayHero amount must be greater than zero');
    }

    if (dto.amount > invoice.balanceAmount) {
      throw new BadRequestException('PayHero amount cannot exceed the invoice balance');
    }

    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const existingPending = await this.prisma.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        paymentMethod: 'PAYHERO',
        statusCode: 'PENDING',
        phoneNumber,
        requestedAt: {
          gte: new Date(Date.now() - Number(process.env.PAYHERO_PROMPT_LOCK_SECONDS ?? 90) * 1000),
        },
      },
      orderBy: { id: 'desc' },
    });

    if (existingPending && !dto.forceResend) {
      throw new ServiceUnavailableException('A recent PayHero prompt is already pending for this phone and invoice.');
    }

    const receiptNumber = `PH-${Date.now()}`;
    const accountReference = dto.accountReference?.trim() || invoice.invoiceNumber;
    const description = dto.description?.trim() || `Invoice ${invoice.invoiceNumber} payment`;

    const payment = await this.prisma.payment.create({
      data: {
        receiptNumber,
        amount: dto.amount,
        paymentMethod: 'PAYHERO',
        statusCode: 'PENDING',
        phoneNumber,
        transactionRef: accountReference,
        requestedAt: new Date(),
        notes: dto.notes,
        facilityId: invoice.facilityId,
        branchId: invoice.branchId,
        invoiceId: invoice.id,
        receivedByStaffId: dto.receivedByStaffId ?? user.staffId ?? undefined,
      },
    });

    const requestBody = {
      amount: dto.amount,
      phone_number: phoneNumber,
      channel_id: Number.isFinite(Number(channelId)) ? Number(channelId) : channelId,
      provider: process.env.PAYHERO_PROVIDER ?? 'm-pesa',
      external_reference: `${invoice.invoiceNumber}-${payment.id}`,
      callback_url: callbackUrl,
      account_reference: accountReference,
      description,
    };

    const startedAt = Date.now();
    this.safeLogger.info('PayHero STK request started', {
      requestId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      amount: dto.amount,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? null,
      phoneNumber: this.maskPhone(phoneNumber),
    });

    const response = await this.fetchWithTimeout(this.stkPushUrl(), {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responsePayload: PayheroInitiateResponse = {};

    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch {
      responsePayload = { message: responseText };
    }

    if (!response.ok) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          statusCode: 'FAILED',
          callbackPayload: this.compactPayload({ provider: 'PAYHERO', response: responsePayload }),
          notes: responsePayload.message ? String(responsePayload.message) : 'PayHero request failed',
        },
      });

      this.safeLogger.warn('PayHero STK request failed', {
        requestId,
        invoiceId: invoice.id,
        paymentId: payment.id,
        status: response.status,
        durationMs: Date.now() - startedAt,
        response: responsePayload,
      });

      throw new ServiceUnavailableException(
        responsePayload.message ? String(responsePayload.message) : 'PayHero request failed',
      );
    }

    const providerReference = this.buildProviderReference(responsePayload);
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutRequestId: providerReference,
        merchantRequestId:
          typeof responsePayload.merchant_request_id === 'string'
            ? responsePayload.merchant_request_id
            : typeof responsePayload.MerchantRequestID === 'string'
              ? responsePayload.MerchantRequestID
              : undefined,
        callbackPayload: this.compactPayload({ provider: 'PAYHERO', initiate: responsePayload }),
      },
    });

    await this.auditLog('PAYHERO_STK_REQUESTED', updatedPayment, user, {
      invoiceId: invoice.id,
      amount: dto.amount,
      phoneNumber: this.maskPhone(phoneNumber),
      providerReference,
    });

    this.safeLogger.info('PayHero STK request completed', {
      requestId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      providerReference,
      durationMs: Date.now() - startedAt,
    });

    return {
      message: 'PayHero payment prompt sent',
      payment: updatedPayment,
      providerResponse: this.safeLogger.sanitize(responsePayload),
    };
  }

  async getPaymentStatus(paymentId: number, user: RequestUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment || payment.paymentMethod !== 'PAYHERO') {
      throw new NotFoundException(`PayHero payment with id ${paymentId} not found`);
    }

    this.scopeService.assertBranchAccess(user, payment.facilityId, payment.branchId);

    return payment;
  }

  async handleCallback(payload: PayheroCallbackPayload) {
    const providerReference = this.buildProviderReference(payload);
    const receiptNumber = this.callbackReceipt(payload);
    const statusCode = this.callbackStatus(payload);
    const paidAmount = this.callbackAmount(payload);
    const phoneNumber = this.callbackPhone(payload);

    const payment = await this.prisma.payment.findFirst({
      where: {
        paymentMethod: 'PAYHERO',
        OR: [
          ...(providerReference
            ? [
                { checkoutRequestId: providerReference },
                { transactionRef: providerReference },
                { merchantRequestId: providerReference },
              ]
            : []),
          ...(receiptNumber ? [{ mpesaReceiptNumber: receiptNumber }] : []),
        ],
      },
      include: { invoice: true },
      orderBy: { id: 'desc' },
    });

    if (!payment) {
      this.safeLogger.warn('PayHero callback did not match a payment', {
        providerReference,
        receiptNumber,
        statusCode,
        phoneNumber: phoneNumber ? this.maskPhone(phoneNumber) : null,
      });
      return { message: 'Callback received', matched: false };
    }

    if (payment.statusCode === 'COMPLETED') {
      return { message: 'PayHero callback already processed', matched: true };
    }

    const callbackPayload = this.compactPayload({ provider: 'PAYHERO', callback: payload });
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          statusCode,
          amount:
            statusCode === 'COMPLETED' && paidAmount !== undefined
              ? Math.min(paidAmount, payment.amount)
              : payment.amount,
          mpesaReceiptNumber: receiptNumber ?? payment.mpesaReceiptNumber,
          transactionRef: providerReference ?? payment.transactionRef,
          checkoutRequestId: providerReference ?? payment.checkoutRequestId,
          phoneNumber: phoneNumber ?? payment.phoneNumber,
          callbackPayload,
          paidAt: statusCode === 'COMPLETED' ? now : payment.paidAt,
          confirmedAt: statusCode === 'COMPLETED' ? now : payment.confirmedAt,
        },
      });

      if (statusCode === 'COMPLETED') {
        const completedPayments = await tx.payment.findMany({
          where: { invoiceId: payment.invoiceId, statusCode: 'COMPLETED' },
          select: { amount: true },
        });
        const paidTotal = completedPayments.reduce((sum, item) => sum + item.amount, 0);
        const balanceAmount = payment.invoice.totalAmount - paidTotal;

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: paidTotal,
            balanceAmount,
            statusCode:
              balanceAmount <= 0 && payment.invoice.totalAmount > 0
                ? 'CLOSED'
                : paidTotal > 0
                  ? 'PARTIALLY_PAID'
                  : 'PENDING',
            settledAt:
              balanceAmount <= 0 && payment.invoice.totalAmount > 0
                ? (payment.invoice.settledAt ?? now)
                : payment.invoice.settledAt,
          },
        });
      }

      return updatedPayment;
    });

    await this.auditLog(`PAYHERO_CALLBACK_${statusCode}`, updated, undefined, {
      paymentId: updated.id,
      invoiceId: payment.invoiceId,
      receiptNumber,
      providerReference,
    });

    this.safeLogger.info('PayHero callback processed', {
      paymentId: updated.id,
      invoiceId: payment.invoiceId,
      statusCode,
      providerReference,
    });

    return { message: 'PayHero callback processed', matched: true, statusCode };
  }

  private async auditLog(
    actionName: string,
    payment: {
      id: number;
      invoiceId: number;
      facilityId: number;
      branchId?: number | null;
    },
    user?: RequestUser,
    data?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          moduleName: 'BILLING',
          actionName,
          entityType: 'PAYMENT',
          entityId: String(payment.id),
          description: actionName.replace(/_/g, ' '),
          facilityId: payment.facilityId,
          branchId: payment.branchId ?? undefined,
          actorUserId: user?.userId,
          actorStaffId: user?.staffId ?? undefined,
          afterData: data ? JSON.stringify(this.safeLogger.sanitize(data)) : undefined,
        },
      });
    } catch {
      // Payment flow should not fail because audit storage is temporarily unavailable.
    }
  }
}
