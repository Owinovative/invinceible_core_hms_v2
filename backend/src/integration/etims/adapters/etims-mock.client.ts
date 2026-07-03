import { createHash } from 'crypto';
import {
  ETIMS_RESULT_DUPLICATE,
  ETIMS_RESULT_OK,
  EtimsApiError,
  type EtimsClientPort,
  type EtimsDeviceInfo,
  type EtimsSalesPayload,
  type EtimsStatusResult,
  type EtimsSubmitResult,
} from '../etims.types';

/**
 * Deterministic in-memory eTIMS adapter used in development, tests, and any
 * environment without KRA connectivity. Mirrors the real result-code
 * semantics (000 success, 801 duplicate) so business flows exercise the same
 * paths they will in production. Swapped for the HTTP adapter purely via
 * configuration — no business code changes.
 */
export class EtimsMockClient implements EtimsClientPort {
  private readonly submitted = new Map<number, EtimsSubmitResult>();
  private sequence = 0;

  initializeDevice(): Promise<EtimsDeviceInfo> {
    return Promise.resolve({
      sdcId: 'SDC-MOCK-0001',
      mrcNumber: 'MRC-MOCK-0001',
      cmcKey: 'mock-cmc-key',
    });
  }

  submitSale(payload: EtimsSalesPayload): Promise<EtimsSubmitResult> {
    if (this.submitted.has(payload.invcNo)) {
      return Promise.reject(
        new EtimsApiError(
          `Duplicate invoice number ${payload.invcNo}`,
          ETIMS_RESULT_DUPLICATE,
          false,
        ),
      );
    }

    this.sequence += 1;
    const digest = createHash('sha256')
      .update(JSON.stringify({ invcNo: payload.invcNo, tot: payload.totAmt }))
      .digest('hex')
      .toUpperCase();

    const result: EtimsSubmitResult = {
      resultCode: ETIMS_RESULT_OK,
      resultMessage: 'Success',
      cuInvoiceNumber: `SDC-MOCK-0001/${payload.invcNo}`,
      cuReceiptNumber: String(this.sequence),
      internalData: digest.slice(0, 20),
      receiptSignature: digest.slice(20, 36),
      sdcDateTime: new Date().toISOString(),
      sdcId: 'SDC-MOCK-0001',
      mrcNumber: 'MRC-MOCK-0001',
      raw: { mock: true },
    };

    this.submitted.set(payload.invcNo, result);
    return Promise.resolve(result);
  }

  checkStatus(invcNo: number): Promise<EtimsStatusResult> {
    const found = this.submitted.get(invcNo);
    return Promise.resolve({
      resultCode: found ? ETIMS_RESULT_OK : '001',
      resultMessage: found ? 'Success' : 'No data found',
      statusCode: found ? 'ACCEPTED' : 'UNKNOWN',
      raw: { mock: true },
    });
  }

  /** Test hook: clears the duplicate-tracking state. */
  reset(): void {
    this.submitted.clear();
    this.sequence = 0;
  }
}
