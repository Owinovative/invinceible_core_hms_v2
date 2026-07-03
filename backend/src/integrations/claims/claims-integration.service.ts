import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IClaimsIntegration, ClaimPreauthRequest, ClaimPreauthResponse, ClaimSubmissionRequest, ClaimSubmissionResponse } from '../interfaces/claims.interface';
import { DhaAuthService } from '../authentication/dha-auth.service';
import { IntegrationLoggerService } from '../../integration/integration-logger.service';
import { FhirBundleBuilder } from '../fhir/fhir-bundle.builder';

@Injectable()
export class ClaimsIntegrationService implements IClaimsIntegration {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: DhaAuthService,
    private readonly logger: IntegrationLoggerService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('DHA_CLAIMS_URL', 'https://afyalink.dha.go.ke/api/claims/v1');
  }

  async requestPreauth(request: ClaimPreauthRequest): Promise<ClaimPreauthResponse> {
    const token = await this.authService.getValidToken();

    // Map to FHIR Claim (Preauthorization)
    const payload = {
      resourceType: 'Claim',
      status: 'active',
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'institutional' }] },
      use: 'preauthorization',
      patient: { reference: `Patient/${request.patientId}` },
      provider: { reference: `Organization/${request.facilityId}` },
      priority: { coding: [{ code: 'normal' }] },
      item: request.proposedServices.map((srv, idx) => ({
        sequence: idx + 1,
        productOrService: { coding: [{ code: srv.code }] },
        unitPrice: { value: srv.amount, currency: 'KES' },
      })),
    };

    try {
      const response = await fetch(`${this.baseUrl}/Claim/$preauth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Preauth request failed: ${response.statusText}`);

      const data = await response.json(); // Expected FHIR ClaimResponse
      return {
        preauthId: data.preAuthRef || data.id,
        status: data.outcome === 'complete' ? 'APPROVED' : data.outcome === 'queued' ? 'PENDING' : 'DENIED',
        approvedAmount: data.total?.[0]?.amount?.value || 0,
        reason: data.disposition,
        requiresReview: data.outcome === 'queued',
      };
    } catch (error: any) {
      this.logger.error('Claim Preauthorization failed', { integration: 'DHA_CLAIMS', error: error.message });
      throw error;
    }
  }

  async submitClaim(request: ClaimSubmissionRequest): Promise<ClaimSubmissionResponse> {
    const token = await this.authService.getValidToken();

    const builder = new FhirBundleBuilder();
    builder.addClaim(request);
    const bundle = builder.build();

    try {
      const response = await fetch(`${this.baseUrl}/Claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify(bundle),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claim submission failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        externalClaimId: data.id,
        status: 'SUBMITTED',
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error('Claim Submission failed', { integration: 'DHA_CLAIMS', claimId: request.claimId, error: error.message });
      throw error;
    }
  }

  async checkClaimStatus(externalClaimId: string): Promise<{ status: string; paidAmount?: number; reason?: string }> {
    const token = await this.authService.getValidToken();

    try {
      const response = await fetch(`${this.baseUrl}/ClaimResponse?request=${externalClaimId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
        },
      });

      if (!response.ok) throw new Error(`Status check failed: ${response.statusText}`);

      const data = await response.json();
      const claimResponse = data.entry?.[0]?.resource;

      if (!claimResponse) return { status: 'PENDING' };

      return {
        status: claimResponse.outcome === 'complete' ? 'APPROVED' : claimResponse.outcome === 'error' ? 'REJECTED' : 'PENDING',
        paidAmount: claimResponse.payment?.amount?.value,
        reason: claimResponse.disposition,
      };
    } catch (error: any) {
      this.logger.error('Claim Status check failed', { integration: 'DHA_CLAIMS', externalClaimId, error: error.message });
      throw error;
    }
  }
}
