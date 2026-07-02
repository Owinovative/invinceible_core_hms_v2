import 'reflect-metadata';
import { IntegrationModule } from './integration.module';
import { DHA_CLIENT, ETIMS_CLIENT } from './integration.constants';
import { EtimsMockClient } from './etims/adapters/etims-mock.client';
import { EtimsHttpClient } from './etims/adapters/etims-http.client';
import { DhaMockClient } from './dha/adapters/dha-mock.client';
import { DhaHttpClient } from './dha/adapters/dha-http.client';
import { IntegrationHttpClient } from './http/integration-http.client';
import { InMemoryPrisma } from './testing/in-memory-prisma';
import { makeAudit, makeConfig, makeLogger } from './testing/test-support';

type FactoryProvider = {
  provide: unknown;
  useFactory: (...args: unknown[]) => unknown;
};

function getFactory(token: unknown): FactoryProvider {
  const providers = Reflect.getMetadata('providers', IntegrationModule) as
    | Array<FactoryProvider | { name?: string }>
    | undefined;
  const provider = providers?.find(
    (candidate) => (candidate as FactoryProvider).provide === token,
  ) as FactoryProvider | undefined;
  if (!provider) throw new Error('provider not found');
  return provider;
}

describe('IntegrationModule adapter selection', () => {
  const http = new IntegrationHttpClient(
    makeLogger(),
    makeAudit(new InMemoryPrisma()),
  );

  it('binds the mock eTIMS adapter in mock mode', () => {
    const factory = getFactory(ETIMS_CLIENT);
    const client = factory.useFactory(makeConfig({ ETIMS_MODE: 'mock' }), http);
    expect(client).toBeInstanceOf(EtimsMockClient);
  });

  it('binds the HTTP eTIMS adapter in sandbox/production modes', () => {
    const factory = getFactory(ETIMS_CLIENT);
    expect(
      factory.useFactory(makeConfig({ ETIMS_MODE: 'sandbox' }), http),
    ).toBeInstanceOf(EtimsHttpClient);
    expect(
      factory.useFactory(makeConfig({ ETIMS_MODE: 'production' }), http),
    ).toBeInstanceOf(EtimsHttpClient);
  });

  it('binds the mock DHA adapter in mock mode', () => {
    const factory = getFactory(DHA_CLIENT);
    expect(
      factory.useFactory(makeConfig({ DHA_MODE: 'mock' }), http),
    ).toBeInstanceOf(DhaMockClient);
  });

  it('binds the HTTP DHA adapter in sandbox/production modes', () => {
    const factory = getFactory(DHA_CLIENT);
    expect(
      factory.useFactory(makeConfig({ DHA_MODE: 'sandbox' }), http),
    ).toBeInstanceOf(DhaHttpClient);
  });
});
