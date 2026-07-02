import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationAuditService } from '../integration-audit.service';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import {
  ETIMS_CLIENT,
  ETIMS_DOCUMENT_TYPE,
  ETIMS_OPERATIONS,
  ETIMS_STATUS,
  INTEGRATION_NAMES,
  type EtimsDocumentType,
} from '../integration.constants';
import {
  NonRetryableIntegrationError,
  isNonRetryableError,
  type OutboundQueueItem,
} from '../integration.types';
import { toErrorMessage } from '../http/retry-policy';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationQueueWorker } from '../queue/integration-queue.worker';
import {
  EtimsInvoiceBuilder,
  type BuilderInvoice,
  type BuilderInvoiceItem,
} from './etims-invoice.builder';
import { normalizeTaxCode, type TaxOptions } from './etims-tax.util';
import {
  EtimsApiError,
  EtimsValidationError,
  type EtimsClientPort,
} from './etims.types';

export interface FiscalizeOptions {
  correlationId?: string;
  /** What finalized the bill, for the audit trail (e.g. CASH_PAYMENT). */
  trigger?: string;
  actorUserId?: number;
  actorStaffId?: number;
}

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    items: { include: { billingService: true } };
    patient: true;
    facility: true;
  };
}>;

const ACTIVE_SALE_STATUSES: string[] = [
  ETIMS_STATUS.PENDING,
  ETIMS_STATUS.QUEUED,
  ETIMS_STATUS.SUBMITTED,
  ETIMS_STATUS.ACCEPTED,
];

/**
 * Business-facing eTIMS service. Billing talks to this service only —
 * never to an eTIMS API client directly. Submissions ride the durable
 * outbound queue, so KRA downtime never blocks billing: documents are
 * created locally, queued, and synchronized automatically with retries and
 * exponential backoff.
 *
 * Document lifecycle:
 *   PENDING -> QUEUED -> ACCEPTED
 *                     -> REJECTED  (KRA rejected; non-retryable)
 *                     -> CANCELLED (reversed by a credit note)
 */
@Injectable()
export class EtimsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: IntegrationConfigService,
    private readonly queue: IntegrationQueueService,
    private readonly worker: IntegrationQueueWorker,
    private readonly builder: EtimsInvoiceBuilder,
    private readonly audit: IntegrationAuditService,
    private readonly logger: IntegrationLoggerService,
    @Inject(ETIMS_CLIENT) private readonly client: EtimsClientPort,
  ) {}

  onModuleInit() {
    this.worker.registerHandler(
      INTEGRATION_NAMES.ETIMS,
      ETIMS_OPERATIONS.SUBMIT_INVOICE,
      (item) => this.handleSubmitRequest(item),
    );
  }

  get enabled(): boolean {
    return this.config.etimsEnabled;
  }

  private taxOptions(): TaxOptions {
    return {
      defaultTaxCode: normalizeTaxCode(this.config.etimsDefaultTaxCode, 'A'),
      vatRatePercent: this.config.etimsVatRatePercent,
    };
  }

  /**
   * Entry point called by billing whenever a bill is finalized (payment
   * completed or invoice closed). Idempotent: an invoice gets exactly one
   * active SALE document regardless of how many times billing calls this.
   */
  async onBillingFinalized(invoiceId: number, options: FiscalizeOptions = {}) {
    if (!this.enabled) {
      return { skipped: true as const, reason: 'ETIMS_DISABLED' };
    }

    const invoice = await this.loadInvoice(invoiceId);
    if (invoice.totalAmount <= 0) {
      return { skipped: true as const, reason: 'NON_POSITIVE_TOTAL' };
    }

    const existing = await this.prisma.etimsInvoice.findFirst({
      where: {
        invoiceId,
        documentType: ETIMS_DOCUMENT_TYPE.SALE,
        statusCode: { in: ACTIVE_SALE_STATUSES },
      },
    });
    if (existing) {
      return {
        skipped: true as const,
        reason: 'ALREADY_FISCALIZED',
        document: existing,
      };
    }

    const document = await this.createDocument({
      invoice,
      documentType: ETIMS_DOCUMENT_TYPE.SALE,
      correlationId: options.correlationId,
    });

    await this.enqueueSubmission(document.id, invoice, options);

    await this.audit.recordEvent({
      moduleName: 'ETIMS',
      actionName: 'FISCALIZATION_REQUESTED',
      entityType: 'ETIMS_INVOICE',
      entityId: String(document.id),
      description: `eTIMS fiscalization queued for invoice ${invoice.invoiceNumber} (trigger: ${options.trigger ?? 'UNSPECIFIED'})`,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      actorUserId: options.actorUserId,
      actorStaffId: options.actorStaffId,
    });

    return { skipped: false as const, document };
  }

  /** Queue handler: performs the actual submission to KRA. */
  private async handleSubmitRequest(item: OutboundQueueItem): Promise<void> {
    const payload = (item.payload ?? {}) as { etimsInvoiceId?: number };
    if (!payload.etimsInvoiceId) {
      throw new NonRetryableIntegrationError(
        'Queue payload is missing etimsInvoiceId',
      );
    }
    await this.submitDocument(
      payload.etimsInvoiceId,
      item.correlationId ?? undefined,
    );
  }

  async submitDocument(
    etimsInvoiceId: number,
    correlationId?: string,
  ): Promise<void> {
    const document = await this.prisma.etimsInvoice.findUnique({
      where: { id: etimsInvoiceId },
      include: { original: true },
    });
    if (!document) {
      throw new NonRetryableIntegrationError(
        `eTIMS document ${etimsInvoiceId} not found`,
      );
    }
    if (
      document.statusCode === ETIMS_STATUS.ACCEPTED ||
      document.statusCode === ETIMS_STATUS.CANCELLED
    ) {
      return; // Already settled; retry after crash landed here.
    }

    const invoice = await this.loadInvoice(document.invoiceId);
    // Partial amendments persist their item selection on the document until
    // submission succeeds (requestPayload is then replaced by the payload).
    const storedRequest = document.requestPayload as {
      itemIds?: number[];
    } | null;
    const builderInvoice = this.toBuilderInvoice(
      invoice,
      storedRequest?.itemIds,
    );

    await this.prisma.etimsInvoice.update({
      where: { id: document.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      const built = this.builder.buildSalePayload({
        etimsInvoiceId: document.id,
        documentType: document.documentType as EtimsDocumentType,
        originalInvcNo: document.original?.id,
        invoice: builderInvoice,
        taxOptions: this.taxOptions(),
        paymentTypeCode: document.paymentTypeCode ?? undefined,
        remark: document.cancelReason ?? undefined,
      });

      const result = await this.client.submitSale(built.payload, {
        correlationId,
        facilityId: invoice.facilityId,
      });

      const qr = await this.buildQr(result.receiptSignature);

      await this.prisma.etimsInvoice.update({
        where: { id: document.id },
        data: {
          statusCode: ETIMS_STATUS.ACCEPTED,
          cuInvoiceNumber: result.cuInvoiceNumber,
          cuReceiptNumber: result.cuReceiptNumber,
          internalData: result.internalData,
          receiptSignature: result.receiptSignature,
          sdcId: result.sdcId ?? null,
          mrcNumber: result.mrcNumber ?? null,
          sdcDateTime: new Date(result.sdcDateTime),
          qrCodeUrl: qr.url,
          qrCodeData: qr.dataUrl,
          totalTaxableAmount: built.totals.totalTaxable,
          totalTaxAmount: built.totals.totalTax,
          totalAmount: built.totals.totalAmount,
          taxBreakdown: built.taxBreakdown as Prisma.InputJsonValue,
          requestPayload: built.payload as unknown as Prisma.InputJsonValue,
          responsePayload: (result.raw ?? {}) as Prisma.InputJsonValue,
          errorMessage: null,
          submittedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      await this.audit.recordEvent({
        moduleName: 'ETIMS',
        actionName: 'INVOICE_ACCEPTED',
        entityType: 'ETIMS_INVOICE',
        entityId: String(document.id),
        description: `eTIMS ${document.documentType} accepted for invoice ${invoice.invoiceNumber}; CU invoice ${result.cuInvoiceNumber}`,
        facilityId: invoice.facilityId,
        branchId: invoice.branchId ?? undefined,
        afterData: {
          cuInvoiceNumber: result.cuInvoiceNumber,
          cuReceiptNumber: result.cuReceiptNumber,
          totalAmount: built.totals.totalAmount,
        },
      });
    } catch (error) {
      await this.recordSubmissionFailure(document.id, invoice, error);
      throw error;
    }
  }

  private async recordSubmissionFailure(
    documentId: number,
    invoice: InvoiceWithRelations,
    error: unknown,
  ): Promise<void> {
    const permanent =
      isNonRetryableError(error) ||
      error instanceof EtimsValidationError ||
      (error instanceof EtimsApiError && !error.retryable);

    await this.prisma.etimsInvoice.update({
      where: { id: documentId },
      data: {
        statusCode: permanent ? ETIMS_STATUS.REJECTED : ETIMS_STATUS.QUEUED,
        errorMessage: toErrorMessage(error).slice(0, 4_000),
      },
    });

    if (permanent) {
      await this.audit.recordEvent({
        moduleName: 'ETIMS',
        actionName: 'INVOICE_REJECTED',
        entityType: 'ETIMS_INVOICE',
        entityId: String(documentId),
        description: `eTIMS rejected document for invoice ${invoice.invoiceNumber}: ${toErrorMessage(error)}`,
        facilityId: invoice.facilityId,
        branchId: invoice.branchId ?? undefined,
      });
      // Ensure the queue dead-letters instead of retrying a permanent failure.
      if (!isNonRetryableError(error)) {
        throw new NonRetryableIntegrationError(toErrorMessage(error));
      }
    }
  }

  /** Issues a credit note against an accepted sale (full or partial). */
  async createCreditNote(
    invoiceId: number,
    params: {
      reason: string;
      itemIds?: number[];
      correlationId?: string;
      actorUserId?: number;
      actorStaffId?: number;
    },
  ) {
    return this.createAmendment(
      invoiceId,
      ETIMS_DOCUMENT_TYPE.CREDIT_NOTE,
      params,
    );
  }

  /** Issues a debit note (additional charge) against an accepted sale. */
  async createDebitNote(
    invoiceId: number,
    params: {
      reason: string;
      itemIds?: number[];
      correlationId?: string;
      actorUserId?: number;
      actorStaffId?: number;
    },
  ) {
    return this.createAmendment(
      invoiceId,
      ETIMS_DOCUMENT_TYPE.DEBIT_NOTE,
      params,
    );
  }

  private async createAmendment(
    invoiceId: number,
    documentType: EtimsDocumentType,
    params: {
      reason: string;
      itemIds?: number[];
      correlationId?: string;
      actorUserId?: number;
      actorStaffId?: number;
    },
  ) {
    this.assertEnabled();
    if (!params.reason?.trim()) {
      throw new BadRequestException('A reason is required');
    }

    const original = await this.getAcceptedSale(invoiceId);
    const invoice = await this.loadInvoice(invoiceId);

    const document = await this.createDocument({
      invoice,
      documentType,
      originalId: original.id,
      reason: params.reason,
      itemIds: params.itemIds,
      correlationId: params.correlationId,
    });

    await this.enqueueSubmission(document.id, invoice, params);

    await this.audit.recordEvent({
      moduleName: 'ETIMS',
      actionName: `${documentType}_REQUESTED`,
      entityType: 'ETIMS_INVOICE',
      entityId: String(document.id),
      description: `eTIMS ${documentType} queued for invoice ${invoice.invoiceNumber}: ${params.reason}`,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      actorUserId: params.actorUserId,
      actorStaffId: params.actorStaffId,
    });

    return document;
  }

  /**
   * Cancels a fiscalized invoice. Per KRA practice an accepted transaction
   * is reversed with a full credit note; the local sale document is then
   * marked CANCELLED for reporting.
   */
  async cancelInvoice(
    invoiceId: number,
    params: {
      reason: string;
      correlationId?: string;
      actorUserId?: number;
      actorStaffId?: number;
    },
  ) {
    this.assertEnabled();
    if (!params.reason?.trim()) {
      throw new BadRequestException('A cancellation reason is required');
    }

    const original = await this.getAcceptedSale(invoiceId);
    const creditNote = await this.createAmendment(
      invoiceId,
      ETIMS_DOCUMENT_TYPE.CREDIT_NOTE,
      params,
    );

    const cancelled = await this.prisma.etimsInvoice.update({
      where: { id: original.id },
      data: {
        statusCode: ETIMS_STATUS.CANCELLED,
        cancelReason: params.reason,
        cancelledAt: new Date(),
      },
    });

    await this.audit.recordEvent({
      moduleName: 'ETIMS',
      actionName: 'INVOICE_CANCELLED',
      entityType: 'ETIMS_INVOICE',
      entityId: String(original.id),
      description: `eTIMS invoice cancelled via credit note ${creditNote.traderInvoiceNumber}: ${params.reason}`,
      facilityId: cancelled.facilityId,
      branchId: cancelled.branchId ?? undefined,
      actorUserId: params.actorUserId,
      actorStaffId: params.actorStaffId,
    });

    return { cancelled, creditNote };
  }

  async getInvoiceFiscalStatus(invoiceId: number) {
    const documents = await this.prisma.etimsInvoice.findMany({
      where: { invoiceId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        documentType: true,
        traderInvoiceNumber: true,
        statusCode: true,
        cuInvoiceNumber: true,
        cuReceiptNumber: true,
        receiptSignature: true,
        qrCodeUrl: true,
        qrCodeData: true,
        totalTaxableAmount: true,
        totalTaxAmount: true,
        totalAmount: true,
        errorMessage: true,
        attemptCount: true,
        submittedAt: true,
        acceptedAt: true,
        cancelledAt: true,
        createdAt: true,
        originalId: true,
      },
    });
    return { enabled: this.enabled, documents };
  }

  /** Re-checks CU-side status for a document (support/ops tooling). */
  async refreshDocumentStatus(etimsInvoiceId: number, correlationId?: string) {
    this.assertEnabled();
    const document = await this.prisma.etimsInvoice.findUnique({
      where: { id: etimsInvoiceId },
    });
    if (!document) {
      throw new NotFoundException(`eTIMS document ${etimsInvoiceId} not found`);
    }
    const status = await this.client.checkStatus(document.id, {
      correlationId,
      facilityId: document.facilityId,
    });
    return { document, remoteStatus: status };
  }

  /**
   * Manual synchronization trigger: drains one worker batch immediately
   * instead of waiting for the poll interval. Automatic sync runs
   * continuously in the background worker.
   */
  async syncNow() {
    this.assertEnabled();
    const result = await this.worker.runOnce();
    const stats = await this.queue.getStats();
    return { ...result, stats };
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new BadRequestException(
        'eTIMS integration is disabled (set ETIMS_ENABLED=true)',
      );
    }
  }

  private async getAcceptedSale(invoiceId: number) {
    const original = await this.prisma.etimsInvoice.findFirst({
      where: {
        invoiceId,
        documentType: ETIMS_DOCUMENT_TYPE.SALE,
        statusCode: {
          in: [ETIMS_STATUS.ACCEPTED, ETIMS_STATUS.CANCELLED],
        },
      },
      orderBy: { id: 'desc' },
    });
    if (!original || original.statusCode !== ETIMS_STATUS.ACCEPTED) {
      throw new BadRequestException(
        original
          ? 'The fiscalized invoice is already cancelled'
          : 'Invoice has no accepted eTIMS sale to amend',
      );
    }
    return original;
  }

  private async loadInvoice(invoiceId: number): Promise<InvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: { include: { billingService: true } },
        patient: true,
        facility: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }

  private toBuilderInvoice(
    invoice: InvoiceWithRelations,
    itemIds?: number[],
  ): BuilderInvoice {
    let items = invoice.items.filter((item) => !item.isRemoved);
    if (itemIds?.length) {
      const wanted = new Set(itemIds);
      items = invoice.items.filter((item) => wanted.has(item.id));
    }

    const builderItems: BuilderInvoiceItem[] = items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
      sourceModule: item.sourceModule,
      billingServiceCode: item.billingService?.code ?? null,
      taxCode: null,
    }));

    const patientName = [
      invoice.patient?.firstName,
      invoice.patient?.middleName,
      invoice.patient?.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      issuedAt: invoice.issuedAt,
      patientName: patientName || null,
      patientPhone: invoice.patient?.phonePrimary ?? null,
      // Patients rarely present a KRA PIN at the point of care; when the
      // patient record gains a taxPin field it maps here.
      patientTaxPin: null,
      items: builderItems,
    };
  }

  private async createDocument(params: {
    invoice: InvoiceWithRelations;
    documentType: EtimsDocumentType;
    originalId?: number;
    reason?: string;
    itemIds?: number[];
    correlationId?: string;
  }) {
    const suffix =
      params.documentType === ETIMS_DOCUMENT_TYPE.CREDIT_NOTE
        ? '-CN'
        : params.documentType === ETIMS_DOCUMENT_TYPE.DEBIT_NOTE
          ? '-DN'
          : '';
    const siblingCount = suffix
      ? await this.prisma.etimsInvoice.count({
          where: {
            invoiceId: params.invoice.id,
            documentType: params.documentType,
          },
        })
      : 0;
    const traderInvoiceNumber = suffix
      ? `${params.invoice.invoiceNumber}${suffix}${siblingCount + 1}`
      : params.invoice.invoiceNumber;

    // Validate before persisting so obviously broken invoices fail fast at
    // the API boundary rather than in the background worker.
    const builderInvoice = this.toBuilderInvoice(
      params.invoice,
      params.itemIds,
    );
    this.builder.validate(builderInvoice, builderInvoice.items);

    return this.prisma.etimsInvoice.create({
      data: {
        documentType: params.documentType,
        traderInvoiceNumber,
        statusCode: ETIMS_STATUS.PENDING,
        receiptTypeCode:
          params.documentType === ETIMS_DOCUMENT_TYPE.CREDIT_NOTE ? 'R' : 'S',
        totalAmount: params.invoice.totalAmount,
        requestPayload: params.itemIds?.length
          ? ({ itemIds: params.itemIds } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        cancelReason: params.reason ?? null,
        correlationId: params.correlationId ?? randomUUID(),
        invoiceId: params.invoice.id,
        originalId: params.originalId ?? null,
        facilityId: params.invoice.facilityId,
        branchId: params.invoice.branchId ?? null,
      },
    });
  }

  private async enqueueSubmission(
    documentId: number,
    invoice: InvoiceWithRelations,
    options: { correlationId?: string },
  ): Promise<void> {
    const enqueueResult = await this.queue.enqueue({
      integration: INTEGRATION_NAMES.ETIMS,
      operation: ETIMS_OPERATIONS.SUBMIT_INVOICE,
      entityType: 'ETIMS_INVOICE',
      entityId: String(documentId),
      payload: { etimsInvoiceId: documentId },
      idempotencyKey: `etims:submit:${documentId}`,
      correlationId: options.correlationId,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
    });

    await this.prisma.etimsInvoice.update({
      where: { id: documentId },
      data: { statusCode: ETIMS_STATUS.QUEUED },
    });

    this.logger.info('eTIMS document queued for submission', {
      etimsInvoiceId: documentId,
      invoiceNumber: invoice.invoiceNumber,
      queued: enqueueResult.queued,
      correlationId: options.correlationId,
    });
  }

  private async buildQr(
    receiptSignature: string,
  ): Promise<{ url: string; dataUrl: string | null }> {
    const url =
      `${this.config.etimsReceiptBaseUrl}?Data=` +
      `${this.config.etimsTin}${this.config.etimsBranchId}${receiptSignature}`;
    try {
      const dataUrl = await toDataURL(url, { margin: 1, width: 220 });
      return { url, dataUrl };
    } catch {
      // QR rendering must never fail a fiscalization; the URL alone is valid.
      return { url, dataUrl: null };
    }
  }
}
