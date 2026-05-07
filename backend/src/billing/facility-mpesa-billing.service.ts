import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { BillingService } from './billing.service';
import { CreateMpesaPaymentRequestDto } from './dto/create-mpesa-payment-request.dto';
import { ConfirmMpesaPaymentDto } from './dto/confirm-mpesa-payment.dto';
import { SafeLoggerService } from '../resilience/safe-logger.service';

type FacilityMpesaContext = {
  invoiceId: number;
  invoiceNumber?: string | null;
  requestId?: string;
  facility: Record<string, any>;
  branch?: Record<string, any> | null;
};

type FacilityMpesaRuntimeConfig = {
  env: Record<string, string>;
  environment: string;
  transactionType: string;
  shortcode: string;
  paybill: string;
};

@Injectable()
export class FacilityMpesaBillingService {
  private mpesaEnvQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  async createMpesaPaymentRequest(
    dto: CreateMpesaPaymentRequestDto,
    user: RequestUser,
    requestId?: string,
  ) {
    const context = await this.getMpesaContextFromInvoice(dto.invoiceId);
    context.requestId = requestId;

    return this.runWithFacilityMpesaEnv(context, () =>
      this.billingService.createMpesaPaymentRequest(dto, user),
    );
  }

  async resendMpesaPaymentRequest(
    paymentId: number,
    user: RequestUser,
    requestId?: string,
  ) {
    const payment = await (this.prisma as any).payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });

    if (!payment?.invoice) {
      throw new NotFoundException(`Payment with id ${paymentId} not found`);
    }

    const context = this.contextFromInvoice(payment.invoice);
    context.requestId = requestId;

    return this.runWithFacilityMpesaEnv(context, () =>
      this.billingService.resendMpesaPaymentRequest(paymentId, user),
    );
  }

  async getMpesaPaymentStatus(checkoutRequestId: string, user: RequestUser) {
    const payment = await (this.prisma as any).payment.findFirst({
      where: { checkoutRequestId },
      include: {
        invoice: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });

    if (!payment?.invoice) {
      return this.billingService.getMpesaPaymentStatus(checkoutRequestId, user);
    }

    const context = this.contextFromInvoice(payment.invoice);

    return this.runWithFacilityMpesaEnv(context, () =>
      this.billingService.getMpesaPaymentStatus(checkoutRequestId, user),
    );
  }

  confirmMpesaPayment(dto: ConfirmMpesaPaymentDto) {
    return this.billingService.confirmMpesaPayment(dto);
  }

  failMpesaPayment(
    checkoutRequestId: string,
    callbackPayload?: string,
    user?: RequestUser,
  ) {
    return this.billingService.failMpesaPayment(
      checkoutRequestId,
      callbackPayload,
      user,
    );
  }

  handleMpesaCallback(payload: unknown) {
    return this.billingService.handleMpesaCallback(payload);
  }

  private async getMpesaContextFromInvoice(invoiceId: number) {
    const invoice = await (this.prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      include: {
        facility: true,
        branch: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    return this.contextFromInvoice(invoice);
  }

  private contextFromInvoice(invoice: Record<string, any>): FacilityMpesaContext {
    if (!invoice.facility) {
      throw new BadRequestException(
        'The invoice facility could not be resolved for M-Pesa prompting.',
      );
    }

    return {
      invoiceId: Number(invoice.id),
      invoiceNumber: invoice.invoiceNumber,
      facility: invoice.facility,
      branch: invoice.branch ?? null,
    };
  }

  private buildFacilityMpesaEnv(context: FacilityMpesaContext) {
    const { facility, branch, invoiceNumber, invoiceId } = context;

    if (facility.mpesaEnabled === false) {
      throw new BadRequestException(
        `${facility.name ?? 'This facility'} has M-Pesa disabled. Enable and configure M-Pesa on the facility profile first.`,
      );
    }

    const consumerKey = this.firstText(facility.mpesaConsumerKey);
    const consumerSecret = this.firstText(facility.mpesaConsumerSecret);
    const passkey = this.firstText(facility.mpesaPasskey);
    const shortcode = this.firstText(
      facility.mpesaShortcode,
      facility.mpesaPaybill,
      branch?.mpesaShortcode,
      branch?.mpesaPaybill,
    );
    const paybill = this.firstText(
      facility.mpesaPaybill,
      facility.mpesaShortcode,
      branch?.mpesaPaybill,
      branch?.mpesaShortcode,
    );
    const callbackUrl = this.firstText(facility.mpesaCallbackUrl);
    const environment =
      this.firstText(facility.mpesaEnvironment) ?? 'sandbox';
    const transactionType =
      this.firstText(facility.mpesaTransactionType) ??
      (facility.mpesaTillNumber ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline');
    const accountReference = this.firstText(
      facility.mpesaAccountNumber,
      branch?.mpesaAccountNumber,
    ) ?? `${facility.code ?? 'FAC'}-${invoiceNumber ?? `INV-${invoiceId}`}`;
    const transactionDesc = `Invoice ${invoiceNumber ?? invoiceId} payment`;

    const missing = [
      ['consumer key', consumerKey],
      ['consumer secret', consumerSecret],
      ['passkey', passkey],
      ['shortcode/paybill', shortcode],
      ['callback URL', callbackUrl],
    ]
      .filter(([, value]) => !value)
      .map(([label]) => label);

    if (missing.length > 0) {
      this.safeLogger.warn('Facility M-Pesa configuration incomplete', {
        facilityId: this.safeNumber(facility.id),
        branchId: this.safeNumber(branch?.id),
        missingFields: missing,
      });

      throw new BadRequestException(
        `${facility.name ?? 'This facility'} is missing M-Pesa ${missing.join(', ')}. Complete the facility M-Pesa settings before sending an STK prompt.`,
      );
    }

    const resolvedShortcode = shortcode!;
    const resolvedPaybill = paybill ?? resolvedShortcode;

    return {
      env: this.withAliases({
        consumerKey: consumerKey!,
        consumerSecret: consumerSecret!,
        passkey: passkey!,
        shortcode: resolvedShortcode,
        paybill: resolvedPaybill,
        callbackUrl: callbackUrl!,
        environment,
        transactionType,
        accountReference,
        transactionDesc,
      }),
      environment,
      transactionType,
      shortcode: resolvedShortcode,
      paybill: resolvedPaybill,
    } satisfies FacilityMpesaRuntimeConfig;
  }

  private async runWithFacilityMpesaEnv<T>(
    context: FacilityMpesaContext,
    work: () => Promise<T>,
  ) {
    const startedAt = Date.now();
    const config = this.buildFacilityMpesaEnv(context);
    const previousQueue = this.mpesaEnvQueue;
    let releaseQueue: () => void = () => {};

    this.safeLogger.info('Starting facility M-Pesa request', {
      ...this.logContext(context),
      environment: config.environment,
      transactionType: config.transactionType,
      shortcode: this.maskIdentifier(config.shortcode),
      paybill: this.maskIdentifier(config.paybill),
    });

    this.mpesaEnvQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    await previousQueue;

    this.safeLogger.info('Switching facility M-Pesa environment', {
      ...this.logContext(context),
      environment: config.environment,
      transactionType: config.transactionType,
    });

    const previousValues = new Map<string, string | undefined>();

    for (const [key, value] of Object.entries(config.env)) {
      previousValues.set(key, process.env[key]);
      process.env[key] = value;
    }

    try {
      const result = await work();
      this.safeLogger.info('Facility M-Pesa request completed', {
        ...this.logContext(context),
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.safeLogger.error('Facility M-Pesa request failed', {
        ...this.logContext(context),
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: this.safeErrorMessage(error),
      });
      throw error;
    } finally {
      for (const [key, value] of previousValues.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      this.safeLogger.info('Restored previous M-Pesa environment', {
        ...this.logContext(context),
      });
      releaseQueue();
    }
  }

  private logContext(context: FacilityMpesaContext) {
    return {
      invoiceId: context.invoiceId,
      invoiceNumber: context.invoiceNumber,
      requestId: context.requestId,
      facilityId: this.safeNumber(context.facility.id),
      branchId: this.safeNumber(context.branch?.id),
    };
  }

  private safeNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private maskIdentifier(value?: string | null) {
    if (!value) return undefined;
    if (value.length <= 4) return '****';
    return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
  }

  private safeErrorMessage(error: unknown) {
    if (!(error instanceof Error)) return 'Unknown error';
    const redacted = error.message
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/Basic\s+[^\s]+/gi, 'Basic [REDACTED]')
      .replace(
        /\b(mysql|postgres|postgresql):\/\/[^\s]+/gi,
        '[REDACTED_DATABASE_URL]',
      )
      .replace(
        /\b(consumer[_-]?secret|passkey|access[_-]?token|authorization|password)=([^\s&]+)/gi,
        '$1=[REDACTED]',
      );

    return redacted.length > 500
      ? `${redacted.slice(0, 500)}...[TRUNCATED]`
      : redacted;
  }

  private firstText(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private withAliases(values: {
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    shortcode: string;
    paybill: string;
    callbackUrl: string;
    environment: string;
    transactionType: string;
    accountReference: string;
    transactionDesc: string;
  }) {
    return {
      MPESA_CONSUMER_KEY: values.consumerKey,
      MPESA_CONSUMER_SECRET: values.consumerSecret,
      MPESA_PASSKEY: values.passkey,
      MPESA_SHORTCODE: values.shortcode,
      MPESA_BUSINESS_SHORTCODE: values.shortcode,
      MPESA_BUSINESS_SHORT_CODE: values.shortcode,
      MPESA_PAYBILL: values.paybill,
      MPESA_CALLBACK_URL: values.callbackUrl,
      MPESA_STK_CALLBACK_URL: values.callbackUrl,
      MPESA_ENVIRONMENT: values.environment,
      MPESA_TRANSACTION_TYPE: values.transactionType,
      MPESA_ACCOUNT_REFERENCE: values.accountReference,
      MPESA_TRANSACTION_DESC: values.transactionDesc,

      DARAJA_CONSUMER_KEY: values.consumerKey,
      DARAJA_CONSUMER_SECRET: values.consumerSecret,
      DARAJA_PASSKEY: values.passkey,
      DARAJA_SHORTCODE: values.shortcode,
      DARAJA_BUSINESS_SHORTCODE: values.shortcode,
      DARAJA_PAYBILL: values.paybill,
      DARAJA_CALLBACK_URL: values.callbackUrl,
      DARAJA_ENVIRONMENT: values.environment,
      DARAJA_TRANSACTION_TYPE: values.transactionType,
      DARAJA_ACCOUNT_REFERENCE: values.accountReference,

      SAFARICOM_CONSUMER_KEY: values.consumerKey,
      SAFARICOM_CONSUMER_SECRET: values.consumerSecret,
      SAFARICOM_PASSKEY: values.passkey,
      SAFARICOM_SHORTCODE: values.shortcode,
      SAFARICOM_BUSINESS_SHORTCODE: values.shortcode,
      SAFARICOM_CALLBACK_URL: values.callbackUrl,
      SAFARICOM_ENVIRONMENT: values.environment,
    };
  }
}
