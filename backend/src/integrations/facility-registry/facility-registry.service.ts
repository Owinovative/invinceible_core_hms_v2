import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFacilityRegistry, FacilityRegistryRecord } from '../interfaces/facility-registry.interface';
import { DhaAuthService } from '../authentication/dha-auth.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { IntegrationCacheService } from '../caching/integration-cache.service';
import { IntegrationHttpClient } from '../../integration/http/integration-http.client';

@Injectable()
export class FacilityRegistryService implements IFacilityRegistry {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: DhaAuthService,
    private readonly logger: IntegrationLoggerService,
    private readonly cache: IntegrationCacheService,
    private readonly httpClient: IntegrationHttpClient,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('DHA_FR_URL', 'https://afyalink.dha.go.ke/api/fr/v1');
  }

  async searchFacility(query: { name?: string; code?: string; county?: string }): Promise<FacilityRegistryRecord[]> {
    const token = await this.authService.getValidToken();
    const params = new URLSearchParams();
    if (query.name) params.append('name', query.name);
    if (query.code) params.append('code', query.code);
    if (query.county) params.append('county', query.county);

    try {
      const response = await this.httpClient.request({
        integration: 'DHA',
        baseUrl: this.baseUrl,
        path: `/facilities?${params.toString()}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = response.data as any;
      return data.entry?.map((e: any) => this.mapToRecord(e.resource)) || [];
    } catch (error: any) {
      this.logger.error('Facility Registry search failed', { integration: 'DHA_FR', query, error });
      throw error;
    }
  }

  async getFacilityByCode(code: string): Promise<FacilityRegistryRecord | null> {
    const cacheKey = `fr_facility_${code}`;
    const cached = await this.cache.get<FacilityRegistryRecord>(cacheKey);
    if (cached) return cached;

    const results = await this.searchFacility({ code });
    if (results.length > 0) {
      const facility = results[0];
      await this.cache.set(cacheKey, facility, 86400); // cache for 24h
      return facility;
    }
    return null;
  }

  async validateFacilityCode(code: string): Promise<boolean> {
    const facility = await this.getFacilityByCode(code);
    return facility !== null && facility.status === 'ACTIVE';
  }

  private mapToRecord(fhirOrg: any): FacilityRegistryRecord {
    return {
      id: fhirOrg.id,
      code: fhirOrg.identifier?.find((i: any) => i.system?.includes('facility-code'))?.value || '',
      name: fhirOrg.name || '',
      type: fhirOrg.type?.[0]?.text || 'Unknown',
      status: fhirOrg.active ? 'ACTIVE' : 'INACTIVE',
      county: fhirOrg.address?.[0]?.state,
    };
  }
}
