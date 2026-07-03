import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPractitionerRegistry, PractitionerRegistryRecord } from '../interfaces/practitioner-registry.interface';
import { DhaAuthService } from '../authentication/dha-auth.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { IntegrationCacheService } from '../caching/integration-cache.service';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';

@Injectable()
export class PractitionerRegistryService implements IPractitionerRegistry {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: DhaAuthService,
    private readonly logger: IntegrationLoggerService,
    private readonly cache: IntegrationCacheService,
    private readonly httpClient: IntegrationHttpClient,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('DHA_PR_URL', 'https://afyalink.dha.go.ke/api/pr/v1');
  }

  async searchPractitioner(query: { registrationNumber?: string; board?: string; name?: string }): Promise<PractitionerRegistryRecord[]> {
    const token = await this.authService.getValidToken();
    const params = new URLSearchParams();
    if (query.registrationNumber) params.append('registration_number', query.registrationNumber);
    if (query.board) params.append('board', query.board);
    if (query.name) params.append('name', query.name);

    try {
      const response = await this.httpClient.request({
        integration: 'DHA',
        baseUrl: this.baseUrl,
        path: `/practitioners?${params.toString()}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = response.data as any;
      return data.entry?.map((e: any) => this.mapToRecord(e.resource)) || [];
    } catch (error: any) {
      this.logger.error('Practitioner Registry search failed', { integration: 'DHA_PR', query, error });
      throw error;
    }
  }

  async getPractitionerByRegNumber(registrationNumber: string, board?: string): Promise<PractitionerRegistryRecord | null> {
    const cacheKey = `pr_practitioner_${registrationNumber}`;
    const cached = await this.cache.get<PractitionerRegistryRecord>(cacheKey);
    if (cached) return cached;

    const results = await this.searchPractitioner({ registrationNumber, board });
    if (results.length > 0) {
      const practitioner = results[0];
      await this.cache.set(cacheKey, practitioner, 86400); // 24h cache
      return practitioner;
    }
    return null;
  }

  async validateLicense(registrationNumber: string): Promise<{ valid: boolean; status: string; expiry?: Date }> {
    const practitioner = await this.getPractitionerByRegNumber(registrationNumber);
    if (!practitioner) return { valid: false, status: 'NOT_FOUND' };

    const valid = practitioner.status === 'ACTIVE' && 
      (!practitioner.licenseExpiryDate || practitioner.licenseExpiryDate > new Date());

    return {
      valid,
      status: practitioner.status,
      expiry: practitioner.licenseExpiryDate,
    };
  }

  private mapToRecord(fhirPrac: any): PractitionerRegistryRecord {
    const identifier = fhirPrac.identifier?.find((i: any) => i.system?.includes('registration-number'));
    const name = fhirPrac.name?.[0];

    return {
      id: fhirPrac.id,
      registrationNumber: identifier?.value || '',
      board: identifier?.assigner?.display || 'Unknown',
      firstName: name?.given?.[0] || '',
      lastName: name?.family || '',
      cadre: fhirPrac.qualification?.[0]?.code?.text || 'Unknown',
      status: fhirPrac.active ? 'ACTIVE' : 'SUSPENDED',
      licenseExpiryDate: fhirPrac.qualification?.[0]?.period?.end ? new Date(fhirPrac.qualification[0].period.end) : undefined,
    };
  }
}
