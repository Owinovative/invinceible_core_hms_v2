import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITerminology, TerminologyRecord } from '../interfaces/terminology.interface';
import { DhaAuthService } from '../authentication/dha-auth.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { IntegrationCacheService } from '../caching/integration-cache.service';

@Injectable()
export class TerminologyService implements ITerminology {
  private readonly FAVORITES_KEY = 'icd11_favorites';

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: DhaAuthService,
    private readonly logger: IntegrationLoggerService,
    private readonly cache: IntegrationCacheService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('DHA_TERMINOLOGY_URL', 'https://afyalink.dha.go.ke/api/terminology/v1');
  }

  async searchDiagnosis(query: string): Promise<TerminologyRecord[]> {
    const token = await this.authService.getValidToken();
    const params = new URLSearchParams({ q: query });

    try {
      const response = await fetch(`${this.baseUrl}/ValueSet/$expand?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Terminology search failed: ${response.statusText}`);

      const data = await response.json();
      return data.expansion?.contains?.map((c: any) => ({
        code: c.code,
        display: c.display,
        system: c.system,
        version: c.version,
      })) || [];
    } catch (error: any) {
      this.logger.error('Terminology search failed', { integration: 'DHA_TERMINOLOGY', query, error: error.message });
      throw error;
    }
  }

  async getDiagnosisByCode(code: string): Promise<TerminologyRecord | null> {
    const cacheKey = `icd11_${code}`;
    const cached = await this.cache.get<TerminologyRecord>(cacheKey);
    if (cached) return cached;

    const token = await this.authService.getValidToken();
    try {
      const response = await fetch(`${this.baseUrl}/CodeSystem/$lookup?code=${code}&system=http://hl7.org/fhir/sid/icd-11`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Terminology lookup failed: ${response.statusText}`);
      }

      const data = await response.json();
      const record: TerminologyRecord = {
        code,
        display: data.parameter?.find((p: any) => p.name === 'display')?.valueString || '',
        system: 'http://hl7.org/fhir/sid/icd-11',
      };
      
      await this.cache.set(cacheKey, record, 604800); // 7 days
      return record;
    } catch (error: any) {
      this.logger.error('Terminology lookup failed', { integration: 'DHA_TERMINOLOGY', code, error: error.message });
      throw error;
    }
  }

  async getFavorites(): Promise<TerminologyRecord[]> {
    const codes = await this.cache.get<string[]>(this.FAVORITES_KEY) || [];
    const favorites: TerminologyRecord[] = [];
    for (const code of codes) {
      const record = await this.getDiagnosisByCode(code);
      if (record) favorites.push(record);
    }
    return favorites;
  }

  async addToFavorites(code: string): Promise<void> {
    const codes = await this.cache.get<string[]>(this.FAVORITES_KEY) || [];
    if (!codes.includes(code)) {
      codes.push(code);
      await this.cache.set(this.FAVORITES_KEY, codes);
    }
  }
}
