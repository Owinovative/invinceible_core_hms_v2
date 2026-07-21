import { Inject, Injectable } from '@nestjs/common';
import { DHA_CLIENT } from '../../integration/integration.constants';
import type { DhaClientPort } from '../../integration/dha/dha.types';
import {
  FacilityRegistryRecord,
  IFacilityRegistry,
} from '../interfaces/facility-registry.interface';

/** Compatibility facade over the single, allowlisted DHA HTTP adapter. */
@Injectable()
export class FacilityRegistryService implements IFacilityRegistry {
  constructor(@Inject(DHA_CLIENT) private readonly dha: DhaClientPort) {}

  async searchFacility(query: {
    name?: string;
    code?: string;
    county?: string;
  }): Promise<FacilityRegistryRecord[]> {
    if (!query.code) return [];
    const result = await this.dha.verifyFacility({ facilityCode: query.code });
    if (result.status !== 'VERIFIED') return [];
    const data = this.record(result.data);
    return [
      {
        id: this.string(data.id ?? result.externalRef, query.code),
        code: this.string(data.code ?? data.identifier, query.code),
        name: this.string(data.name, query.name),
        type: this.string(data.type, 'Health Facility'),
        status: 'ACTIVE',
        county: typeof data.county === 'string' ? data.county : query.county,
      },
    ];
  }

  async getFacilityByCode(code: string) {
    return (await this.searchFacility({ code }))[0] ?? null;
  }

  async validateFacilityCode(code: string): Promise<boolean> {
    return (
      (await this.dha.verifyFacility({ facilityCode: code })).status ===
      'VERIFIED'
    );
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private string(value: unknown, fallback = ''): string {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : fallback;
  }
}
