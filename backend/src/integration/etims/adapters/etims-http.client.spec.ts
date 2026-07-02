import { EtimsHttpClient } from './etims-http.client';
import { EtimsApiError, type EtimsSalesPayload } from '../etims.types';
import type { IntegrationHttpClient } from '../../http/integration-http.client';
import { makeConfig } from '../../testing/test-support';

describe('EtimsHttpClient', () => {
  function makeClient(responses: Array<{ data: unknown } | Error>) {
    let index = 0;
    const calls: Array<Record<string, unknown>> = [];
    const http = {
      request: jest.fn((options: Record<string, unknown>) => {
        calls.push(options);
        const next = responses[Math.min(index, responses.length - 1)];
        index += 1;
        if (next instanceof Error) return Promise.reject(next);
        return Promise.resolve({
          status: 200,
          data: next.data,
          requestId: 'req-1',
          latencyMs: 10,
          retryCount: 0,
        });
      }),
    } as unknown as IntegrationHttpClient;
    const client = new EtimsHttpClient(
      http,
      makeConfig({ ETIMS_MODE: 'sandbox' }),
    );
    return { client, calls };
  }

  const salePayload = { invcNo: 5 } as unknown as EtimsSalesPayload;

  it('sends device credentials as headers on every call', async () => {
    const { client, calls } = makeClient([
      {
        data: {
          resultCd: '000',
          data: { curRcptNo: '9', sdcId: 'SDC1', rcptSign: 'SIG' },
        },
      },
    ]);
    await client.submitSale(salePayload, { correlationId: 'c-1' });

    expect(calls[0]).toMatchObject({
      integration: 'ETIMS',
      path: '/saveTrnsSalesOsdc',
      method: 'POST',
      correlationId: 'c-1',
      headers: {
        tin: 'P051234567X',
        bhfId: '00',
        cmcKey: 'test-cmc-key',
      },
    });
  });

  it('unwraps successful sale envelopes into CU receipt data', async () => {
    const { client } = makeClient([
      {
        data: {
          resultCd: '000',
          resultMsg: 'Success',
          data: {
            curRcptNo: '15',
            totRcptNo: '150',
            intrlData: 'INTERNAL',
            rcptSign: 'SIGNATURE',
            sdcDateTime: '2026-07-02T10:00:00Z',
            sdcId: 'SDC0001',
            mrcNo: 'MRC0001',
          },
        },
      },
    ]);

    const result = await client.submitSale(salePayload);
    expect(result.cuInvoiceNumber).toBe('SDC0001/5');
    expect(result.cuReceiptNumber).toBe('15');
    expect(result.internalData).toBe('INTERNAL');
    expect(result.receiptSignature).toBe('SIGNATURE');
    expect(result.mrcNumber).toBe('MRC0001');
  });

  it('maps non-zero result codes to EtimsApiError with retryability', async () => {
    const { client } = makeClient([
      { data: { resultCd: '801', resultMsg: 'Duplicate invoice' } },
    ]);
    await expect(client.submitSale(salePayload)).rejects.toMatchObject({
      resultCode: '801',
      retryable: false,
    });

    const transient = makeClient([
      { data: { resultCd: '999', resultMsg: 'System error' } },
    ]);
    await expect(
      transient.client.submitSale(salePayload),
    ).rejects.toMatchObject({ resultCode: '999', retryable: true });
  });

  it('initializes the device and extracts credentials', async () => {
    const { client, calls } = makeClient([
      {
        data: {
          resultCd: '000',
          data: {
            info: { sdcId: 'SDC9', mrcNo: 'MRC9', cmcKey: 'issued-key' },
          },
        },
      },
    ]);
    const info = await client.initializeDevice();
    expect(info).toEqual({
      sdcId: 'SDC9',
      mrcNumber: 'MRC9',
      cmcKey: 'issued-key',
    });
    expect(calls[0]).toMatchObject({ path: '/selectInitOsdcInfo' });
    expect((calls[0].body as Record<string, unknown>).dvcSrlNo).toBe('DEV001');
  });

  it('looks up transaction status', async () => {
    const { client, calls } = makeClient([
      { data: { resultCd: '000', data: { sttsCd: '02' } } },
    ]);
    const status = await client.checkStatus(12);
    expect(status.statusCode).toBe('02');
    expect(calls[0]).toMatchObject({ path: '/selectTrnsSalesStatus' });
  });

  it('propagates transport errors from the shared HTTP client', async () => {
    const { client } = makeClient([new Error('ECONNREFUSED')]);
    await expect(client.submitSale(salePayload)).rejects.toThrow(
      'ECONNREFUSED',
    );
  });

  it('treats an empty envelope as a failure, not a success', async () => {
    const { client } = makeClient([{ data: {} }]);
    await expect(client.submitSale(salePayload)).rejects.toBeInstanceOf(
      EtimsApiError,
    );
  });
});
