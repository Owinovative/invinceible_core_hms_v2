import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationCacheService } from '../caching/integration-cache.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';

@Injectable()
export class DhaAuthService {
  private readonly DHA_TOKEN_KEY = 'dha_access_token';

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

    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    this.logger.info('Refreshing DHA access token', { integration: 'DHA' });

    const tokenUrl = this.configService.get<string>('DHA_TOKEN_URL', 'https://auth.dha.go.ke/oauth/token');
    const clientId = this.configService.get<string>('DHA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('DHA_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.error('DHA credentials missing in configuration', { integration: 'DHA' });
      throw new UnauthorizedException('DHA credentials not configured');
    }

    try {
      const response = await this.httpClient.request({
        integration: 'DHA',
        baseUrl: tokenUrl,
        path: '',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      const data = response.data as any;
      const accessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;

      // Cache token, expire 5 minutes early to prevent race conditions
      const ttl = Math.max(expiresIn - 300, 60);
      await this.cache.set(this.DHA_TOKEN_KEY, accessToken, ttl);

      return accessToken;
    } catch (error: any) {
      this.logger.error('Error refreshing DHA token', { integration: 'DHA', error });
      throw new UnauthorizedException('Failed to authenticate with DHA HIE');
    }
  }

  async invalidateToken(): Promise<void> {
    await this.cache.delete(this.DHA_TOKEN_KEY);
  }
}
