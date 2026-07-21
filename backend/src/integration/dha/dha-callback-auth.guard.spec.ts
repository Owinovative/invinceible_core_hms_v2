import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { makeConfig } from '../testing/test-support';
import { DhaCallbackAuthGuard } from './dha-callback-auth.guard';

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('DhaCallbackAuthGuard', () => {
  it('accepts the configured Basic credentials', () => {
    const guard = new DhaCallbackAuthGuard(makeConfig());
    const encoded = Buffer.from('callback-user:callback-password').toString(
      'base64',
    );
    expect(guard.canActivate(context(`Basic ${encoded}`))).toBe(true);
  });

  it('rejects missing or invalid credentials', () => {
    const guard = new DhaCallbackAuthGuard(makeConfig());
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
    const encoded = Buffer.from('callback-user:wrong').toString('base64');
    expect(() => guard.canActivate(context(`Basic ${encoded}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('fails closed when callback credentials are not configured', () => {
    const guard = new DhaCallbackAuthGuard(
      makeConfig({ DHA_CALLBACK_USERNAME: '', DHA_CALLBACK_PASSWORD: '' }),
    );
    expect(() => guard.canActivate(context('Basic ignored'))).toThrow(
      ServiceUnavailableException,
    );
  });
});
