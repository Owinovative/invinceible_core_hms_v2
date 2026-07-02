import { EtimsMockClient } from './etims-mock.client';
import { EtimsApiError, type EtimsSalesPayload } from '../etims.types';

function payload(invcNo: number): EtimsSalesPayload {
  return {
    invcNo,
    orgInvcNo: 0,
    custTin: null,
    custNm: 'Test Patient',
    salesTyCd: 'N',
    rcptTyCd: 'S',
    pmtTyCd: '01',
    salesSttsCd: '02',
    cfmDt: '20260701120000',
    salesDt: '20260701',
    totItemCnt: 1,
    taxblAmtA: 100,
    taxblAmtB: 0,
    taxblAmtC: 0,
    taxblAmtD: 0,
    taxblAmtE: 0,
    taxRtA: 0,
    taxRtB: 16,
    taxRtC: 0,
    taxRtD: 0,
    taxRtE: 8,
    taxAmtA: 0,
    taxAmtB: 0,
    taxAmtC: 0,
    taxAmtD: 0,
    taxAmtE: 0,
    totTaxblAmt: 100,
    totTaxAmt: 0,
    totAmt: 100,
    prchrAcptcYn: 'N',
    receipt: { rcptPbctDt: '20260701120000', prchrAcptcYn: 'N' },
    itemList: [],
  };
}

describe('EtimsMockClient', () => {
  let client: EtimsMockClient;

  beforeEach(() => {
    client = new EtimsMockClient();
  });

  it('initializes a deterministic mock device', async () => {
    expect(await client.initializeDevice()).toEqual({
      sdcId: 'SDC-MOCK-0001',
      mrcNumber: 'MRC-MOCK-0001',
      cmcKey: 'mock-cmc-key',
    });
  });

  it('accepts a sale and returns CU receipt data', async () => {
    const result = await client.submitSale(payload(1));
    expect(result.resultCode).toBe('000');
    expect(result.cuInvoiceNumber).toBe('SDC-MOCK-0001/1');
    expect(result.cuReceiptNumber).toBe('1');
    expect(result.receiptSignature).toHaveLength(16);
    expect(result.internalData).toHaveLength(20);
  });

  it('increments the CU receipt counter per submission', async () => {
    await client.submitSale(payload(1));
    const second = await client.submitSale(payload(2));
    expect(second.cuReceiptNumber).toBe('2');
  });

  it('rejects duplicate invoice numbers with KRA code 801', async () => {
    await client.submitSale(payload(1));
    await expect(client.submitSale(payload(1))).rejects.toMatchObject({
      resultCode: '801',
      retryable: false,
    });
    await expect(client.submitSale(payload(1))).rejects.toBeInstanceOf(
      EtimsApiError,
    );
  });

  it('reports status for submitted and unknown invoices', async () => {
    await client.submitSale(payload(7));
    expect((await client.checkStatus(7)).statusCode).toBe('ACCEPTED');
    expect((await client.checkStatus(8)).statusCode).toBe('UNKNOWN');
  });

  it('reset() clears duplicate tracking', async () => {
    await client.submitSale(payload(1));
    client.reset();
    await expect(client.submitSale(payload(1))).resolves.toMatchObject({
      cuReceiptNumber: '1',
    });
  });
});
