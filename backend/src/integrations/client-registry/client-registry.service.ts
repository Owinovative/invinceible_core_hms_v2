import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IClientRegistry, PatientRegistryRecord, PatientEligibility } from '../interfaces/client-registry.interface';
import { DhaAuthService } from '../authentication/dha-auth.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';

@Injectable()
export class ClientRegistryService implements IClientRegistry {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: DhaAuthService,
    private readonly logger: IntegrationLoggerService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('DHA_CR_URL', 'https://afyalink.dha.go.ke/api/cr/v1');
  }

  async searchPatient(query: { nationalId?: string; memberNumber?: string; phone?: string; }): Promise<PatientRegistryRecord[]> {
    const token = await this.authService.getValidToken();
    const params = new URLSearchParams();
    if (query.nationalId) params.append('national_id', query.nationalId);
    if (query.memberNumber) params.append('member_number', query.memberNumber);
    if (query.phone) params.append('phone', query.phone);

    try {
      const response = await fetch(`${this.baseUrl}/patients?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`CR Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      // Assuming FHIR Bundle or custom JSON response
      return data.entry?.map((e: any) => this.mapToRecord(e.resource)) || [];
    } catch (error: any) {
      this.logger.error('Client Registry search failed', { integration: 'DHA_CR', query, error: error.message });
      throw error;
    }
  }

  async getPatientEligibility(patientId: string): Promise<PatientEligibility> {
    const token = await this.authService.getValidToken();

    try {
      const response = await fetch(`${this.baseUrl}/patients/${patientId}/eligibility`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) throw new NotFoundException('Patient eligibility not found');
        throw new Error(`CR Eligibility check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        status: data.status || 'PENDING',
        shaStatus: data.shaStatus || 'INACTIVE',
        eccifStatus: data.eccifStatus || 'INACTIVE',
        pcifStatus: data.pcifStatus || 'INACTIVE',
        pomfStatus: data.pomfStatus || 'INACTIVE',
        ecdfStatus: data.ecdfStatus || 'INACTIVE',
        covers: data.covers || [],
        lastVerifiedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error('Client Registry eligibility check failed', { integration: 'DHA_CR', patientId, error: error.message });
      throw error;
    }
  }

  async registerPatient(patientData: Partial<PatientRegistryRecord>): Promise<PatientRegistryRecord> {
    const token = await this.authService.getValidToken();
    try {
      const response = await fetch(`${this.baseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.mapToFhir(patientData)),
      });

      if (!response.ok) throw new Error(`CR Registration failed: ${response.statusText}`);

      const data = await response.json();
      return this.mapToRecord(data);
    } catch (error: any) {
      this.logger.error('Client Registry registration failed', { integration: 'DHA_CR', error: error.message });
      throw error;
    }
  }

  async updatePatient(patientId: string, updates: Partial<PatientRegistryRecord>): Promise<PatientRegistryRecord> {
    const token = await this.authService.getValidToken();
    try {
      const response = await fetch(`${this.baseUrl}/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.mapToFhir(updates)),
      });

      if (!response.ok) throw new Error(`CR Update failed: ${response.statusText}`);

      const data = await response.json();
      return this.mapToRecord(data);
    } catch (error: any) {
      this.logger.error('Client Registry update failed', { integration: 'DHA_CR', patientId, error: error.message });
      throw error;
    }
  }

  private mapToRecord(fhirResource: any): PatientRegistryRecord {
    // Basic mapping from FHIR Patient to our internal record
    const name = fhirResource.name?.[0];
    const identifier = fhirResource.identifier?.find((i: any) => i.system?.includes('national-id'));
    const memberId = fhirResource.identifier?.find((i: any) => i.system?.includes('sha-member'));

    return {
      id: fhirResource.id,
      nationalId: identifier?.value,
      memberNumber: memberId?.value,
      firstName: name?.given?.[0] || '',
      lastName: name?.family || '',
      gender: fhirResource.gender || 'unknown',
      dateOfBirth: new Date(fhirResource.birthDate),
      phone: fhirResource.telecom?.find((t: any) => t.system === 'phone')?.value,
    };
  }

  private mapToFhir(record: Partial<PatientRegistryRecord>): any {
    return {
      resourceType: 'Patient',
      id: record.id,
      name: [{
        family: record.lastName,
        given: [record.firstName, record.middleName].filter(Boolean),
      }],
      gender: record.gender,
      birthDate: record.dateOfBirth?.toISOString().split('T')[0],
      identifier: [
        ...(record.nationalId ? [{ system: 'http://dha.go.ke/identifiers/national-id', value: record.nationalId }] : []),
        ...(record.memberNumber ? [{ system: 'http://dha.go.ke/identifiers/sha-member', value: record.memberNumber }] : []),
      ],
      telecom: record.phone ? [{ system: 'phone', value: record.phone }] : [],
    };
  }
}
