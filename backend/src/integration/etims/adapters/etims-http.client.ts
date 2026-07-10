import { IntegrationHttpClient } from '../../http/integration-http.client';
import type { IntegrationConfigService } from '../../integration-config.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import { INTEGRATION_NAMES } from '../../integration.constants';
import type { IntegrationCallContext } from '../../integration.types';
import {
  ETIMS_RESULT_OK,
  EtimsApiError,
  type EtimsClientPort,
  type EtimsDeviceInfo,
  type EtimsSalesPayload,
  type EtimsStatusResult,
  type EtimsSubmitResult,
} from '../etims.types';

interface EtimsEnvelope<T = Record<string, unknown>> {
  resultCd?: string;
  resultMsg?: string;
  resultDt?: string;
  data?: T;
}

/** KRA result codes that indicate a transient server-side condition. */
const RETRYABLE_RESULT_CODES = new Set(['802', '890', '899', '990', '999']);

/**
 * OSCU-style HTTP adapter for KRA eTIMS. Authentication uses the device
 * credentials (tin, bhfId, cmcKey) issued during device initialization —
 * they are sent as headers on every call and never logged. Endpoint paths
 * follow the OSCU specification; the VSCU variant only differs in base URL.
 */
export class EtimsHttpClient implements EtimsClientPort {
  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCredentials(facilityId?: number) {
    let tin = this.config.etimsTin;
    let bhfId = this.config.etimsBranchId;
    let cmcKey = this.config.etimsCmcKey;
    let serial = this.config.etimsDeviceSerial;

    if (facilityId) {
      const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
      if (facility) {
        tin = facility.etimsTin || tin;
        bhfId = facility.etimsBranchId || bhfId;
        cmcKey = facility.etimsCmcKey || cmcKey;
        serial = facility.etimsDeviceSerial || serial;
      }
    }
    return { tin, bhfId, cmcKey, serial };
  }

  private async authHeaders(ctx?: IntegrationCallContext): Promise<Record<string, string>> {
    const creds = await this.getCredentials(ctx?.facilityId);
    return {
      tin: creds.tin,
      bhfId: creds.bhfId,
      cmcKey: creds.cmcKey,
    };
  }

  private async post<T>(
    path: string,
    body: unknown,
    ctx?: IntegrationCallContext,
  ): Promise<EtimsEnvelope<T>> {
    const response = await this.http.request<EtimsEnvelope<T>>({
      integration: INTEGRATION_NAMES.ETIMS,
      baseUrl: this.config.etimsBaseUrl,
      path,
      method: 'POST',
      headers: await this.authHeaders(ctx),
      body,
      timeoutMs: this.config.etimsTimeoutMs,
      maxAttempts: 3,
      correlationId: ctx?.correlationId,
      facilityId: ctx?.facilityId,
    });
    return response.data ?? {};
  }

  private unwrap<T>(envelope: EtimsEnvelope<T>, operation: string): T {
    const resultCode = envelope.resultCd ?? '';
    if (resultCode !== ETIMS_RESULT_OK) {
      throw new EtimsApiError(
        `eTIMS ${operation} failed: ${envelope.resultMsg ?? 'unknown error'} (${resultCode})`,
        resultCode,
        RETRYABLE_RESULT_CODES.has(resultCode),
      );
    }
    return (envelope.data ?? {}) as T;
  }

  async initializeDevice(
    ctx?: IntegrationCallContext,
  ): Promise<EtimsDeviceInfo> {
    const creds = await this.getCredentials(ctx?.facilityId);
    const envelope = await this.post<{
      info?: { sdcId?: string; mrcNo?: string; cmcKey?: string };
    }>(
      '/selectInitOsdcInfo',
      {
        tin: creds.tin,
        bhfId: creds.bhfId,
        dvcSrlNo: creds.serial,
      },
      ctx,
    );
    const data = this.unwrap(envelope, 'device initialization');
    return {
      sdcId: data.info?.sdcId ?? '',
      mrcNumber: data.info?.mrcNo ?? '',
      cmcKey: data.info?.cmcKey,
    };
  }

  async submitSale(
    payload: EtimsSalesPayload,
    ctx?: IntegrationCallContext,
  ): Promise<EtimsSubmitResult> {
    const envelope = await this.post<{
      curRcptNo?: string;
      totRcptNo?: string;
      intrlData?: string;
      rcptSign?: string;
      sdcDateTime?: string;
      sdcId?: string;
      mrcNo?: string;
    }>('/saveTrnsSalesOsdc', payload, ctx);
    const data = this.unwrap(envelope, 'sales submission');
    return {
      resultCode: envelope.resultCd ?? ETIMS_RESULT_OK,
      resultMessage: envelope.resultMsg ?? 'Success',
      cuInvoiceNumber: `${data.sdcId ?? ''}/${payload.invcNo}`,
      cuReceiptNumber: data.curRcptNo ?? '',
      internalData: data.intrlData ?? '',
      receiptSignature: data.rcptSign ?? '',
      sdcDateTime: data.sdcDateTime ?? new Date().toISOString(),
      sdcId: data.sdcId,
      mrcNumber: data.mrcNo,
      raw: envelope,
    };
  }

  async checkStatus(
    invcNo: number,
    ctx?: IntegrationCallContext,
  ): Promise<EtimsStatusResult> {
    const creds = await this.getCredentials(ctx?.facilityId);
    const envelope = await this.post<{ sttsCd?: string }>(
      '/selectTrnsSalesStatus',
      {
        tin: creds.tin,
        bhfId: creds.bhfId,
        invcNo,
      },
      ctx,
    );
    const data = this.unwrap(envelope, 'status lookup');
    return {
      resultCode: envelope.resultCd ?? ETIMS_RESULT_OK,
      resultMessage: envelope.resultMsg ?? 'Success',
      statusCode: data.sttsCd ?? 'UNKNOWN',
      raw: envelope,
    };
  }
}
