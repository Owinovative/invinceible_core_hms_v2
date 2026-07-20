import { IntegrationHttpClient } from '../../http/integration-http.client';
import { IntegrationHttpError } from '../../http/retry-policy';
import type { IntegrationConfigService } from '../../integration-config.service';
import { INTEGRATION_NAMES } from '../../integration.constants';
import type { IntegrationLoggerService } from '../../integration-logger.service';
import type {
  HttpMethod,
  IntegrationCallContext,
} from '../../integration.types';
import { DhaAccessTokenService } from '../dha-access-token.service';
import {
  DHA_API_OPERATIONS,
  type DhaApiOperation,
  type DhaApiPayload,
  validateDhaApiPayload,
} from '../dha-api-contract';
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

function transportScalar(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  throw new DhaApiError(
    'DHA query and path parameters must be scalar values',
    undefined,
    false,
  );
}

/**
 * UAT adapter for the Digital Health Agency HIE. Only operations whose route
 * contract is represented here may make a network request. Legacy guessed
 * FHIR routes fail closed until their current OpenAPI contracts are imported.
 */
export class DhaHttpClient implements DhaClientPort {
  private readonly tokens: DhaAccessTokenService;

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
    tokens?: DhaAccessTokenService,
  ) {
    this.tokens =
      tokens ?? new DhaAccessTokenService(this.http, this.config, this.logger);
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
    baseUrl = this.config.dhaBaseUrl,
  ): Promise<DhaEnvelope> {
    let token = await this.tokens.getToken();

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.http.request<DhaEnvelope>({
          integration: INTEGRATION_NAMES.DHA,
          baseUrl,
          path: this.path(resource),
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(body instanceof FormData
              ? {}
              : { 'Content-Type': 'application/json' }),
            'X-Facility-Id':
              ctx?.facilityRegistryId ?? this.config.dhaFacilityId,
            'X-Facility-Id-Type':
              ctx?.facilityRegistryIdType ?? this.config.dhaFacilityIdType,
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
          this.tokens.invalidate();
          token = await this.tokens.getToken();
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

  async executeApiOperation<T = unknown>(
    operation: DhaApiOperation,
    payload: DhaApiPayload,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<T>> {
    validateDhaApiPayload(operation, payload);
    const contract = DHA_API_OPERATIONS[operation];
    const pathFields = new Set<string>();
    const operationPath = contract.path.replace(
      /\{([a-zA-Z0-9_]+)\}/g,
      (_placeholder, field: string) => {
        pathFields.add(field);
        const value = payload[field];
        if (value === undefined || value === null || value === '') {
          throw new DhaApiError(
            `${operation} requires path parameter ${field}`,
            undefined,
            false,
          );
        }
        return encodeURIComponent(transportScalar(value));
      },
    );
    const query =
      contract.transport === 'query'
        ? Object.fromEntries(
            Object.entries(payload)
              .filter(
                ([key, value]) =>
                  !pathFields.has(key) && value !== undefined && value !== null,
              )
              .map(([key, value]) => [
                key,
                Array.isArray(value)
                  ? value.map(transportScalar).join(',')
                  : transportScalar(value),
              ]),
          )
        : undefined;
    let body: unknown;
    if (contract.transport === 'json') body = payload;
    if (contract.transport === 'multipart') {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (pathFields.has(key)) continue;
        if (value === undefined || value === null) continue;
        if (value instanceof Blob) {
          form.append(key, value);
        } else if (Array.isArray(value) || typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, transportScalar(value));
        }
      }
      body = form;
    }
    const envelope = await this.call(
      contract.method,
      operationPath,
      body,
      ctx,
      query,
      operation === 'PUBLISH_SHR_BUNDLE'
        ? this.config.dhaClinicalBaseUrl
        : this.config.dhaBaseUrl,
    );
    const result = this.toResult(envelope, 'SUCCESS', 'FAILED');
    return result as DhaResult<T>;
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
      queryParams.shaNumber;
    if (!identificationNumber) {
      throw new DhaApiError(
        'Patient search requires a Client Registry or approved identification number',
        undefined,
        false,
      );
    }
    const envelope = await this.call('GET', '/patients', undefined, ctx, {
      identification_number: identificationNumber,
      identification_type:
        queryParams.identificationType ??
        (queryParams.shaNumber ? 'SHA Number' : 'National ID'),
    });
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
    const identificationNumber =
      queryParams.practitionerId ??
      queryParams.registrationNumber ??
      queryParams.identificationNumber;
    const identificationType =
      queryParams.identificationType ??
      (queryParams.registrationNumber ? 'registration_number' : undefined);
    if (!identificationNumber || !identificationType) {
      throw new DhaApiError(
        'Practitioner search requires a practitioner ID or both identificationType and identificationNumber',
        undefined,
        false,
      );
    }
    const envelope = await this.call('GET', '/professionals', undefined, ctx, {
      identification_number: identificationNumber,
      identification_type: identificationType,
    });
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
      '/facilities/search',
      undefined,
      ctx,
      {
        identifier: queryParams.facilityCode,
        'identifier-type': 'fr-code',
      },
    );
    const result = this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
    const data = result.data as Record<string, unknown>;
    if (
      data.found === 0 ||
      data.found === false ||
      (Array.isArray(data.results) && data.results.length === 0)
    ) {
      result.status = 'NOT_FOUND';
    }
    return result;
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
    const envelope = await this.call(
      'GET',
      '/patients/eligibility',
      undefined,
      ctx,
      {
        identification_number: identificationNumber,
        identification_type: query.identificationType,
      },
    );
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
    void bundle;
    void ctx;
    return this.unsupported(
      'Legacy FHIR claim submission; use the current eClaims lifecycle operations',
    );
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
    void ctx;
    return this.unsupported(
      'Legacy claim polling; use the current claim and remittance operations',
    );
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
    const envelope = await this.call(
      'POST',
      'claims/otp/discharge',
      request,
      ctx,
    );
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
