import { IntegrationHttpClient } from '../../http/integration-http.client';
import { IntegrationHttpError } from '../../http/retry-policy';
import type { IntegrationConfigService } from '../../integration-config.service';
import { INTEGRATION_NAMES } from '../../integration.constants';
import type { IntegrationLoggerService } from '../../integration-logger.service';
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
import type {
  PatientContact,
  SendOtpRequest,
  SendOtpResponse,
  AuthorizeConsentRequest,
  AuthorizeConsentResponse,
  SendDischargeOtpRequest,
} from '../dha.types';

interface DhaEnvelope {
  message?: unknown;
  token?: string;
  access_token?: string;
  expires_in?: number;
  status?: string;
  reference?: string;
  id?: string;
  resourceType?: string;
  [key: string]: unknown;
}

function responseString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function claimState(data: Record<string, unknown>): string {
  const direct = responseString(data.status ?? data.state ?? data.outcome);
  if (direct) return direct.toLowerCase();
  const extensions = Array.isArray(data.extension) ? data.extension : [];
  for (const extension of extensions) {
    if (!extension || typeof extension !== 'object') continue;
    const record = extension as Record<string, unknown>;
    if (!responseString(record.url).toLowerCase().includes('claim-state')) {
      continue;
    }
    const value = responseString(record.valueString ?? record.valueCode);
    if (value) return value.toLowerCase();
  }
  return '';
}

/**
 * UAT adapter for the Digital Health Agency HIE. Only operations whose route
 * contract is represented here may make a network request. Legacy guessed
 * FHIR routes fail closed until their current OpenAPI contracts are imported.
 */
export class DhaHttpClient implements DhaClientPort {
  private readonly tokenManager: TokenManager;

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
  ) {
    this.tokenManager = new TokenManager(
      () => this.fetchToken(),
      60,
      this.logger,
    );
  }

  private async fetchToken() {
    const credentials = Buffer.from(
      `${this.config.dhaUsername}:${this.config.dhaPassword}`,
      'utf8',
    ).toString('base64');
    const response = await this.http.request<{
      token?: string;
      access_token?: string;
      expires_in?: number;
    }>({
      integration: INTEGRATION_NAMES.DHA,
      baseUrl: this.config.dhaTokenUrl,
      path: '',
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      query: { key: this.config.dhaConsumerKey },
      timeoutMs: this.config.dhaTimeoutMs,
    });
    return {
      accessToken: response.data?.token ?? response.data?.access_token ?? '',
      expiresInSeconds: response.data?.expires_in ?? 300,
    };
  }

  private path(resource: string): string {
    return resource.startsWith('/') ? resource : `/${resource}`;
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
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(ctx?.consentToken
              ? { 'Authorization-Consent': `Bearer ${ctx.consentToken}` }
              : {}),
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
          this.logger.warn(
            'DHA API returned 401, invalidating token and retrying',
          );
          this.tokenManager.invalidate();
          token = await this.tokenManager.getToken();
          continue;
        }
        if (error instanceof IntegrationHttpError) {
          this.logger.error(`DHA API call failed: ${error.message}`, {
            httpStatus: error.httpStatus,
            retryable: error.retryable,
            resource,
            correlationId: ctx?.correlationId,
          });
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
    const data =
      envelope.message &&
      typeof envelope.message === 'object' &&
      !Array.isArray(envelope.message)
        ? (envelope.message as Record<string, unknown>)
        : envelope;
    const status = responseString(
      data.status ?? data.state ?? data.outcome ?? envelope.status ?? '',
    ).toUpperCase();
    const negativeStatuses = [
      'NOT_FOUND',
      'REJECTED',
      'INACTIVE',
      'NOT_ELIGIBLE',
    ];
    return {
      status: negativeStatuses.includes(status) ? negative : positive,
      externalRef:
        responseString(
          data.reference ?? data.id ?? data.mediator_id ?? envelope.reference,
        ) || undefined,
      data,
      raw: envelope,
    };
  }

  async verifyPatient(
    queryParams: PatientVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const identificationNumber =
      queryParams.identificationNumber ??
      queryParams.nationalId ??
      queryParams.shaNumber ??
      queryParams.patientNumber;
    if (!identificationNumber) {
      throw new DhaApiError(
        'Patient search requires a Client Registry or approved identification number',
        undefined,
        false,
      );
    }
    const envelope = await this.call(
      'GET',
      '/v3/client-registry/fetch-client',
      undefined,
      ctx,
      {
        dynamic_id_search: 1,
        agent: this.config.dhaAgentId,
        id: identificationNumber,
      },
    );
    const result = this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
    const data = result.data as Record<string, unknown>;
    if (data.found === 0 || data.found === false) {
      result.status = 'NOT_FOUND';
    }
    return result;
  }

  async verifyPractitioner(
    queryParams: PractitionerVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const practitionerId =
      queryParams.practitionerId ?? queryParams.registrationNumber;
    const query = practitionerId
      ? { id: practitionerId }
      : {
          identification_type: queryParams.identificationType,
          identification_number: queryParams.identificationNumber,
        };
    if (
      !practitionerId &&
      (!queryParams.identificationType || !queryParams.identificationNumber)
    ) {
      throw new DhaApiError(
        'Practitioner search requires a practitioner ID or both identificationType and identificationNumber',
        undefined,
        false,
      );
    }
    const envelope = await this.call(
      'GET',
      '/v1/practitioner-search',
      undefined,
      ctx,
      query,
    );
    const result = this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
    const data = result.data as Record<string, unknown>;
    if (
      data.found === 0 ||
      data.found === false ||
      responseString(data.is_active).toLowerCase() === 'no'
    ) {
      result.status = 'NOT_FOUND';
    }
    return result;
  }

  async verifyFacility(
    queryParams: FacilityVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    if (!queryParams.facilityCode) {
      throw new DhaApiError(
        'Facility Registry ID is required',
        undefined,
        false,
      );
    }
    const envelope = await this.call(
      'GET',
      '/v2/facility-search',
      undefined,
      ctx,
      { 'facility-fid': queryParams.facilityCode },
    );
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async checkEligibility(
    request: FhirCoverageEligibilityRequest | EligibilityQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const query = request as EligibilityQuery;
    const identificationNumber =
      query.identificationNumber ?? query.nationalId ?? query.memberNumber;
    if (!identificationNumber || !query.identificationType) {
      throw new DhaApiError(
        'Eligibility requires identificationNumber and identificationType from the approved DHA terminology',
        undefined,
        false,
      );
    }
    const envelope = await this.call('GET', '/v2/eligibility', undefined, ctx, {
      identification_number: identificationNumber,
      identification_type: query.identificationType,
    });
    const result = this.toResult(envelope, 'ELIGIBLE', 'NOT_ELIGIBLE');
    const data = result.data as Record<string, unknown>;
    if (Number(data.eligible) !== 1) result.status = 'NOT_ELIGIBLE';
    return result;
  }

  async submitEncounter(
    encounter: FhirEncounter | FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    void encounter;
    void ctx;
    return this.unsupported('Visit and encounter submission');
  }

  async exchangeHealthRecord(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    void bundle;
    void ctx;
    return this.unsupported('Shared Health Record exchange');
  }

  async submitReferral(
    referral: FhirServiceRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    void referral;
    void ctx;
    return this.unsupported('Referral submission');
  }

  async recordConsent(
    consent: FhirConsent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    void consent;
    void ctx;
    return this.unsupported('Legacy FHIR Consent submission');
  }

  async submitClaim(
    bundle: FhirBundle,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', '/v1/shr-med/bundle', bundle, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async submitAuditEvent(
    event: FhirAuditEvent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    void event;
    void ctx;
    return this.unsupported('DHA AuditEvent submission');
  }

  async pollClaimResponse(
    claimNumber: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    if (!claimNumber) {
      throw new DhaApiError('Claim ID is required', undefined, false);
    }
    const envelope = await this.call(
      'GET',
      '/v1/shr-med/claim-status',
      undefined,
      ctx,
      { claim_id: claimNumber },
    );
    const result = this.toResult(envelope, 'ACCEPTED', 'REJECTED');
    const status = claimState(result.data as Record<string, unknown>);
    if (status === 'payment-completed') result.status = 'SETTLED';
    if (status === 'rejected' || status === 'payment-declined') {
      result.status = 'REJECTED';
    }
    return result;
  }

  // --- Consent Management ---
  async getPatientContacts(
    patientId: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<PatientContact[]>> {
    const envelope = await this.call(
      'GET',
      'patients/contacts',
      undefined,
      ctx,
      { patient_id: patientId },
    );
    return this.toResult(envelope, 'SUCCESS', 'FAILED') as unknown as DhaResult<
      PatientContact[]
    >;
  }

  async sendVisitOtp(
    request: SendOtpRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<SendOtpResponse>> {
    const envelope = await this.call('POST', 'claims/otp', request, ctx);
    return this.toResult(
      envelope,
      'SUCCESS',
      'FAILED',
    ) as unknown as DhaResult<SendOtpResponse>;
  }

  async createAuthorization(
    request: AuthorizeConsentRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<AuthorizeConsentResponse>> {
    const envelope = await this.call(
      'POST',
      request.otp_code || request.auth_guid
        ? 'claims/visit'
        : 'claims/authorize',
      request,
      ctx,
    );
    return this.toResult(
      envelope,
      'SUCCESS',
      'FAILED',
    ) as unknown as DhaResult<AuthorizeConsentResponse>;
  }

  async sendDischargeOtp(
    request: SendDischargeOtpRequest,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<SendOtpResponse>> {
    const envelope = await this.call('POST', 'claims/otp', request, ctx);
    return this.toResult(
      envelope,
      'SUCCESS',
      'FAILED',
    ) as unknown as DhaResult<SendOtpResponse>;
  }

  private unsupported(operation: string): Promise<never> {
    return Promise.reject(
      new DhaApiError(
        `${operation} is disabled until its current DHA OpenAPI contract is imported and certified`,
        undefined,
        false,
      ),
    );
  }
}
