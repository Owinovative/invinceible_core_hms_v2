import { IntegrationHttpClient } from '../../http/integration-http.client';
import { IntegrationHttpError } from '../../http/retry-policy';
import type { IntegrationConfigService } from '../../integration-config.service';
import { INTEGRATION_NAMES } from '../../integration.constants';
import type {
  HttpMethod,
  IntegrationCallContext,
} from '../../integration.types';
import { TokenManager } from '../../token/token-manager';
import {
  DhaApiError,
  type DhaClientPort,
  type DhaResult,
  type EligibilityQuery,
  type FacilityVerificationQuery,
  type PatientVerificationQuery,
  type PractitionerVerificationQuery,
} from '../dha.types';
import type {
  FhirAuditEvent,
  FhirBundle,
  FhirConsent,
  FhirCoverageEligibilityRequest,
  FhirEncounter,
  FhirServiceRequest,
} from '../fhir.types';

interface DhaEnvelope {
  status?: string;
  reference?: string;
  id?: string;
  resourceType?: string;
  [key: string]: unknown;
}

/**
 * HTTP adapter for the Digital Health Agency APIs. Uses OAuth2 client
 * credentials with cached token refresh; a 401 invalidates the token and the
 * call is retried once with a fresh one. All endpoints are versioned under
 * /api/{DHA_API_VERSION}/ and exchange FHIR R4 JSON.
 *
 * Endpoint paths are best-effort placeholders following FHIR REST
 * conventions; when the official DHA specification is published only this
 * adapter needs updating — the DhaClientPort contract stays stable.
 */
export class DhaHttpClient implements DhaClientPort {
  private readonly tokenManager: TokenManager;

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
  ) {
    this.tokenManager = new TokenManager(() => this.fetchToken());
  }

  private async fetchToken() {
    const response = await this.http.request<{
      access_token?: string;
      expires_in?: number;
    }>({
      integration: INTEGRATION_NAMES.DHA,
      baseUrl: this.config.dhaTokenUrl || this.config.dhaBaseUrl,
      path: this.config.dhaTokenUrl ? '' : '/oauth2/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.config.dhaClientId}:${this.config.dhaClientSecret}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      timeoutMs: this.config.dhaTimeoutMs,
    });
    return {
      accessToken: response.data?.access_token ?? '',
      expiresInSeconds: response.data?.expires_in ?? 300,
    };
  }

  private path(resource: string): string {
    return `/api/${this.config.dhaApiVersion}/${resource}`;
  }

  private async call(
    method: HttpMethod,
    resource: string,
    body: unknown,
    ctx?: IntegrationCallContext,
    query?: Record<string, string | number | undefined>,
  ): Promise<DhaEnvelope> {
    let token = await this.tokenManager.getToken();

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.http.request<DhaEnvelope>({
          integration: INTEGRATION_NAMES.DHA,
          baseUrl: this.config.dhaBaseUrl,
          path: this.path(resource),
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/fhir+json',
            'Content-Type': 'application/fhir+json',
            'X-API-Version': this.config.dhaApiVersion,
            'X-Facility-Code': this.config.dhaFacilityCode,
          },
          query,
          body,
          timeoutMs: this.config.dhaTimeoutMs,
          maxAttempts: 3,
          correlationId: ctx?.correlationId,
          facilityId: ctx?.facilityId,
        });
        return response.data ?? {};
      } catch (error) {
        // Expired/revoked token: refresh once and retry the call.
        if (
          attempt === 1 &&
          error instanceof IntegrationHttpError &&
          error.httpStatus === 401
        ) {
          this.tokenManager.invalidate();
          token = await this.tokenManager.getToken();
          continue;
        }
        if (error instanceof IntegrationHttpError) {
          throw new DhaApiError(
            error.message,
            error.httpStatus,
            error.retryable,
          );
        }
        throw error;
      }
    }
  }

  private toResult(
    envelope: DhaEnvelope,
    positive: DhaResult['status'],
    negative: DhaResult['status'],
  ): DhaResult {
    const status = String(envelope.status ?? '').toUpperCase();
    const negativeStatuses = [
      'NOT_FOUND',
      'REJECTED',
      'INACTIVE',
      'NOT_ELIGIBLE',
    ];
    return {
      status: negativeStatuses.includes(status) ? negative : positive,
      externalRef: envelope.reference ?? envelope.id,
      data: envelope,
      raw: envelope,
    };
  }

  async verifyPatient(
    queryParams: PatientVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call(
      'POST',
      'patients/verify',
      queryParams,
      ctx,
    );
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async verifyPractitioner(
    queryParams: PractitionerVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call(
      'POST',
      'practitioners/verify',
      queryParams,
      ctx,
    );
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async verifyFacility(
    queryParams: FacilityVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call(
      'POST',
      'facilities/verify',
      queryParams,
      ctx,
    );
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async checkEligibility(
    request: FhirCoverageEligibilityRequest | EligibilityQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call(
      'POST',
      'CoverageEligibilityRequest',
      request,
      ctx,
    );
    return this.toResult(envelope, 'ELIGIBLE', 'NOT_ELIGIBLE');
  }

  async submitEncounter(
    encounter: FhirEncounter | FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'Encounter', encounter, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async exchangeHealthRecord(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'Bundle', bundle, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async submitReferral(
    referral: FhirServiceRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'ServiceRequest', referral, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async recordConsent(
    consent: FhirConsent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'Consent', consent, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async submitClaim(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'Claim', bundle, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async submitAuditEvent(
    event: FhirAuditEvent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'AuditEvent', event, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }
}
