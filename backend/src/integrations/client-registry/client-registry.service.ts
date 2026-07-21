import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { DHA_CLIENT } from '../../integration/integration.constants';
import type { DhaClientPort } from '../../integration/dha/dha.types';
import {
  IClientRegistry,
  PatientEligibility,
  PatientRegistryRecord,
} from '../interfaces/client-registry.interface';

/** Compatibility facade over the current DHA patient and eligibility APIs. */
@Injectable()
export class ClientRegistryService implements IClientRegistry {
  constructor(@Inject(DHA_CLIENT) private readonly dha: DhaClientPort) {}

  async searchPatient(query: {
    nationalId?: string;
    memberNumber?: string;
    phone?: string;
  }): Promise<PatientRegistryRecord[]> {
    const identificationNumber = query.nationalId ?? query.memberNumber;
    if (!identificationNumber) return [];
    const result = await this.dha.verifyPatient({
      identificationNumber,
      identificationType: query.nationalId ? 'National ID' : 'SHA Number',
    });
    if (result.status !== 'VERIFIED') return [];
    const data = this.record(result.data);
    const birthDate = this.date(data.date_of_birth ?? data.dateOfBirth);
    return [
      {
        id: this.string(data.id ?? data.patient_id ?? result.externalRef),
        nationalId: query.nationalId,
        memberNumber: query.memberNumber,
        firstName: this.string(data.first_name ?? data.firstName),
        middleName:
          typeof (data.middle_name ?? data.middleName) === 'string'
            ? String(data.middle_name ?? data.middleName)
            : undefined,
        lastName: this.string(data.last_name ?? data.lastName),
        gender: this.string(data.gender, 'unknown'),
        dateOfBirth: birthDate,
        phone:
          typeof (data.phone ?? data.phone_number) === 'string'
            ? String(data.phone ?? data.phone_number)
            : query.phone,
      },
    ];
  }

  async getPatientEligibility(patientId: string): Promise<PatientEligibility> {
    const result = await this.dha.checkEligibility({
      identificationNumber: patientId,
      identificationType: 'SHA Number',
    });
    const active = result.status === 'ELIGIBLE';
    return {
      status: active ? 'ACTIVE' : 'INACTIVE',
      shaStatus: active ? 'ACTIVE' : 'INACTIVE',
      eccifStatus: 'INACTIVE',
      pcifStatus: 'INACTIVE',
      pomfStatus: 'INACTIVE',
      ecdfStatus: 'INACTIVE',
      covers: [],
      lastVerifiedAt: new Date(),
    };
  }

  registerPatient(): Promise<PatientRegistryRecord> {
    throw new NotImplementedException(
      'DHA patient creation is disabled because it is not present in the approved API contract',
    );
  }

  updatePatient(): Promise<PatientRegistryRecord> {
    throw new NotImplementedException(
      'DHA patient update is disabled because it is not present in the approved API contract',
    );
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private date(value: unknown): Date | undefined {
    if (typeof value !== 'string') return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private string(value: unknown, fallback = ''): string {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : fallback;
  }
}
