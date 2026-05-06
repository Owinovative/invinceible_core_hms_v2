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

type FacilityMpesaContext = {
  invoiceId: number;
  invoiceNumber?: string | null;
  facility: Record<string, any>;
  branch?: Record<string, any> | null;
};

@Injectable()
export class FacilityMpesaBillingService {
  private mpesaEnvQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async createMpesaPaymentRequest(
    dto: CreateMpesaPaymentRequestDto,
    user: RequestUser,
  ) {
    const context = await this.getMpesaContextFromInvoice(dto.invoiceId);

    return this.runWithFacilityMpesaEnv(context, () =>
      this.billingService.createMpesaPaymentRequest(dto, user),
    );
  }

  async resendMpesaPaymentRequest(paymentId: number, user: RequestUser) {
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

  failMpesaPayment(checkoutRequestId: string, callbackPayload?: string) {
    return this.billingService.failMpesaPayment(
      checkoutRequestId,
      callbackPayload,
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
      `${facility.code ?? 'FAC'}-${invoiceNumber ?? `INV-${invoiceId}`}`,
    );
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
      throw new BadRequestException(
        `${facility.name ?? 'This facility'} is missing M-Pesa ${missing.join(', ')}. Complete the facility M-Pesa settings before sending an STK prompt.`,
      );
    }

    return this.withAliases({
      consumerKey: consumerKey!,
      consumerSecret: consumerSecret!,
      passkey: passkey!,
      shortcode: shortcode!,
      paybill: paybill ?? shortcode!,
      callbackUrl: callbackUrl!,
      environment,
      transactionType,
      accountReference,
      transactionDesc,
    });
  }

  private async runWithFacilityMpesaEnv<T>(
    context: FacilityMpesaContext,
    work: () => Promise<T>,
  ) {
    const env = this.buildFacilityMpesaEnv(context);
    const previousQueue = this.mpesaEnvQueue;
    let releaseQueue = () => undefined;

    this.mpesaEnvQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    await previousQueue;

    const previousValues = new Map<string, string | undefined>();

    for (const [key, value] of Object.entries(env)) {
      previousValues.set(key, process.env[key]);
      process.env[key] = value;
    }

    try {
      return await work();
    } finally {
      for (const [key, value] of previousValues.entries()) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      releaseQueue();
    }
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
