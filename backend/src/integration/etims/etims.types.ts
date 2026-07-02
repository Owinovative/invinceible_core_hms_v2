import type { IntegrationCallContext } from '../integration.types';

/**
 * KRA eTIMS tax type codes:
 *   A = VAT exempt (medical services and most hospital supplies)
 *   B = standard rated (16%)
 *   C = zero rated
 *   D = non-VAT
 *   E = reduced rate (8%)
 */
export type EtimsTaxCode = 'A' | 'B' | 'C' | 'D' | 'E';

export interface EtimsSaleItem {
  itemSeq: number;
  itemCd: string;
  itemClsCd: string;
  itemNm: string;
  qty: number;
  prc: number;
  splyAmt: number;
  dcRt: number;
  dcAmt: number;
  taxTyCd: EtimsTaxCode;
  taxblAmt: number;
  taxAmt: number;
  totAmt: number;
}

/**
 * Subset of the eTIMS TrnsSalesSaveWrReq payload (OSCU/VSCU sales
 * transaction). Field names follow the KRA specification.
 */
export interface EtimsSalesPayload {
  invcNo: number;
  orgInvcNo: number;
  custTin: string | null;
  custNm: string | null;
  salesTyCd: 'N';
  rcptTyCd: 'S' | 'R';
  pmtTyCd: string;
  salesSttsCd: string;
  cfmDt: string;
  salesDt: string;
  totItemCnt: number;
  taxblAmtA: number;
  taxblAmtB: number;
  taxblAmtC: number;
  taxblAmtD: number;
  taxblAmtE: number;
  taxRtA: number;
  taxRtB: number;
  taxRtC: number;
  taxRtD: number;
  taxRtE: number;
  taxAmtA: number;
  taxAmtB: number;
  taxAmtC: number;
  taxAmtD: number;
  taxAmtE: number;
  totTaxblAmt: number;
  totTaxAmt: number;
  totAmt: number;
  prchrAcptcYn: 'N';
  remark?: string;
  receipt: {
    custMblNo?: string | null;
    rcptPbctDt: string;
    prchrAcptcYn: 'N';
  };
  itemList: EtimsSaleItem[];
}

export interface EtimsDeviceInfo {
  sdcId: string;
  mrcNumber: string;
  /** Only returned during device initialization; stored as a secret. */
  cmcKey?: string;
}

export interface EtimsSubmitResult {
  resultCode: string;
  resultMessage: string;
  cuInvoiceNumber: string;
  cuReceiptNumber: string;
  internalData: string;
  receiptSignature: string;
  sdcDateTime: string;
  sdcId?: string;
  mrcNumber?: string;
  raw?: unknown;
}

export interface EtimsStatusResult {
  resultCode: string;
  resultMessage: string;
  statusCode: string;
  raw?: unknown;
}

/**
 * Port implemented by every eTIMS adapter (mock, sandbox, production).
 * Business services depend on this interface via the ETIMS_CLIENT token and
 * never on a concrete HTTP client.
 */
export interface EtimsClientPort {
  /** Registers/initializes the OSCU device with KRA. */
  initializeDevice(ctx?: IntegrationCallContext): Promise<EtimsDeviceInfo>;

  /** Submits a sale, credit note, or debit note transaction. */
  submitSale(
    payload: EtimsSalesPayload,
    ctx?: IntegrationCallContext,
  ): Promise<EtimsSubmitResult>;

  /** Looks up the CU-side status of a previously submitted transaction. */
  checkStatus(
    invcNo: number,
    ctx?: IntegrationCallContext,
  ): Promise<EtimsStatusResult>;
}

export const ETIMS_RESULT_OK = '000';
/** KRA duplicate-invoice result code. */
export const ETIMS_RESULT_DUPLICATE = '801';

export class EtimsApiError extends Error {
  constructor(
    message: string,
    readonly resultCode: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'EtimsApiError';
  }
}

export class EtimsValidationError extends Error {
  readonly retryable = false as const;

  constructor(message: string) {
    super(message);
    this.name = 'EtimsValidationError';
  }
}
