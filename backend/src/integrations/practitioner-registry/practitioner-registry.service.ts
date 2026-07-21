import { Inject, Injectable } from '@nestjs/common';
import { DHA_CLIENT } from '../../integration/integration.constants';
import type { DhaClientPort } from '../../integration/dha/dha.types';
import {
  IPractitionerRegistry,
  PractitionerRegistryRecord,
} from '../interfaces/practitioner-registry.interface';

/** Compatibility facade over the single, allowlisted DHA HTTP adapter. */
@Injectable()
export class PractitionerRegistryService implements IPractitionerRegistry {
  constructor(@Inject(DHA_CLIENT) private readonly dha: DhaClientPort) {}

  async searchPractitioner(query: {
    registrationNumber?: string;
    board?: string;
    name?: string;
  }): Promise<PractitionerRegistryRecord[]> {
    if (!query.registrationNumber) return [];
    const result = await this.dha.verifyPractitioner({
      registrationNumber: query.registrationNumber,
      board: query.board,
    });
    if (result.status !== 'VERIFIED') return [];
    const data = this.record(result.data);
    const expiryValue = data.license_expiry_date ?? data.licenseExpiryDate;
    const expiry =
      typeof expiryValue === 'string' ? new Date(expiryValue) : undefined;
    return [
      {
        id: this.string(
          data.id ?? result.externalRef,
          query.registrationNumber,
        ),
        registrationNumber: query.registrationNumber,
        board: this.string(data.regulation_body ?? data.board, query.board),
        firstName: this.string(data.first_name ?? data.firstName),
        lastName: this.string(data.last_name ?? data.lastName, query.name),
        cadre: this.string(data.cadre ?? data.professional_type),
        status: 'ACTIVE',
        licenseExpiryDate:
          expiry && !Number.isNaN(expiry.getTime()) ? expiry : undefined,
      },
    ];
  }

  async getPractitionerByRegNumber(registrationNumber: string, board?: string) {
    return (
      (await this.searchPractitioner({ registrationNumber, board }))[0] ?? null
    );
  }

  async validateLicense(registrationNumber: string) {
    const practitioner =
      await this.getPractitionerByRegNumber(registrationNumber);
    if (!practitioner) return { valid: false, status: 'NOT_FOUND' };
    const valid =
      practitioner.status === 'ACTIVE' &&
      (!practitioner.licenseExpiryDate ||
        practitioner.licenseExpiryDate > new Date());
    return {
      valid,
      status: practitioner.status,
      expiry: practitioner.licenseExpiryDate,
    };
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
