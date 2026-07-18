import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationCacheService } from '../caching/integration-cache.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';

@Injectable()
export class DhaAuthService {
  private readonly DHA_TOKEN_KEY = 'dha_access_token';
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: IntegrationCacheService,
    private readonly logger: IntegrationLoggerService,
    private readonly httpClient: IntegrationHttpClient,
  ) {}

  async getValidToken(): Promise<string> {
    const cachedToken = await this.cache.get<string>(this.DHA_TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async refreshToken(): Promise<string> {
    this.logger.info('Refreshing DHA access token', { integration: 'DHA' });

    const tokenUrl = this.configService.get<string>(
      'DHA_TOKEN_URL',
      `${this.configService.get<string>('DHA_BASE_URL') ?? ''}/v1/hie-auth`,
    );
    const username = this.configService.get<string>('DHA_USERNAME');
    const password = this.configService.get<string>('DHA_PASSWORD');
    const consumerKey = this.configService.get<string>('DHA_CONSUMER_KEY');

    if (!username || !password || !consumerKey) {
      this.logger.error('DHA credentials missing in configuration', {
        integration: 'DHA',
      });
      throw new UnauthorizedException('DHA credentials not configured');
    }

    try {
      const response = await this.httpClient.request({
        integration: 'DHA',
        baseUrl: tokenUrl,
        path: '',
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          Accept: 'application/json',
        },
        query: { key: consumerKey },
      });

      const data = response.data as {
        token?: string;
        access_token?: string;
        expires_in?: number;
      };
      const accessToken = data.token ?? data.access_token;
      const expiresIn = data.expires_in || 300;
      if (!accessToken) {
        throw new Error('DHA authentication response did not include a token');
      }

      // Cache token, expire 5 minutes early to prevent race conditions
      const ttl = Math.max(expiresIn - 300, 60);
      await this.cache.set(this.DHA_TOKEN_KEY, accessToken, ttl);

      return accessToken;
    } catch (error: any) {
      this.logger.error('Error refreshing DHA token', {
        integration: 'DHA',
        error,
      });
      throw new UnauthorizedException('Failed to authenticate with DHA HIE');
    }
  }

  async invalidateToken(): Promise<void> {
    await this.cache.delete(this.DHA_TOKEN_KEY);
  }
}
