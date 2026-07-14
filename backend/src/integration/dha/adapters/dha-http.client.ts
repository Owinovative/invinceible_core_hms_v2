import { IntegrationHttpClient } from '../../http/integration-http.client';
import { IntegrationHttpError } from '../../http/retry-policy';
import type { IntegrationConfigService } from '../../integration-config.service';
import { INTEGRATION_NAMES } from '../../integration.constants';
import type { IntegrationLoggerService } from '../../integration-logger.service';
import type {
  HttpMethod,
  IntegrationCallContext,
} from '../../integration.types';
import type { PrismaService } from '../../../prisma/prisma.service';
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
import { eclaimsRequest, type DhaEclaimsCommand } from '../eclaims-contract';
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
  private readonly tokenManagers = new Map<number, TokenManager>();

  constructor(
    private readonly http: IntegrationHttpClient,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  private getTokenManager(facilityId?: number): TokenManager {
    const key = facilityId ?? 0;
    let manager = this.tokenManagers.get(key);
    if (manager) {
      // Re-insert to mark as recently used (LRU)
      this.tokenManagers.delete(key);
      this.tokenManagers.set(key, manager);
    } else {
      if (this.tokenManagers.size >= 100) {
        // Map iterates in insertion order, so the first key is the oldest
        const firstKey = this.tokenManagers.keys().next().value as
          | number
          | undefined;
        if (firstKey !== undefined) {
          this.tokenManagers.delete(firstKey);
        }
      }
      manager = new TokenManager(
        () => this.fetchToken(facilityId),
        60,
        this.logger,
      );
      this.tokenManagers.set(key, manager);
    }
    return manager;
  }

  private async fetchToken(facilityId?: number) {
    let clientId = this.config.dhaClientId;
    let clientSecret = this.config.dhaClientSecret;

    if (facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: facilityId },
      });
      if (facility?.shaClientId && facility?.shaClientSecret) {
        clientId = facility.shaClientId;
        clientSecret = facility.shaClientSecret;
      }
    }

    const response = await this.http.request<{
      access_token?: string;
      expires_in?: number;
    }>({
      integration: INTEGRATION_NAMES.DHA,
      baseUrl: this.config.dhaBaseUrl,
      path: '/tenants/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      timeoutMs: this.config.dhaTimeoutMs,
    });
    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new DhaApiError('DHA token response did not include access_token', 500, false);
    }
    return {
      accessToken,
      expiresInSeconds: response.data?.expires_in ?? 300,
    };
  }

  private async call(
    method: HttpMethod,
    resource: string,
    body: unknown,
    ctx?: IntegrationCallContext,
    query?: Record<string, string | number | undefined>,
  ): Promise<DhaEnvelope> {
    const tokenManager = this.getTokenManager(ctx?.facilityId);
    let token = await tokenManager.getToken();

    let facilityCode = this.config.dhaFacilityCode;
    if (ctx?.facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: ctx.facilityId },
      });
      if (facility?.shaFidCode) {
        facilityCode = facility.shaFidCode;
      }
    }

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.http.request<DhaEnvelope>({
          integration: INTEGRATION_NAMES.DHA,
          baseUrl: this.config.dhaBaseUrl,
          path: resource,
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(facilityCode
              ? {
                  'X-Facility-Id': facilityCode,
                  'X-Facility-Id-Type': 'fr-code',
                }
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
          tokenManager.invalidate();
          token = await tokenManager.getToken();
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
    const identificationNumber =
      queryParams.nationalId ?? queryParams.shaNumber ?? queryParams.patientNumber;
    if (!identificationNumber || queryParams.phoneNumber) {
      throw new DhaApiError(
        'DHA patient lookup requires an identification number and supported identification type',
        400,
        false,
      );
    }
    const envelope = await this.call('GET', '/patients', undefined, ctx, {
      identification_number: identificationNumber,
      identification_type: queryParams.nationalId
        ? 'National ID'
        : queryParams.shaNumber
          ? 'ClientRegistry ID'
          : 'Temporary ID',
    });
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async verifyPractitioner(
    queryParams: PractitionerVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('GET', '/professionals', undefined, ctx, {
      identification_number: queryParams.registrationNumber,
      identification_type: 'Registration Number',
      regulator: queryParams.board,
    });
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async verifyFacility(
    queryParams: FacilityVerificationQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('GET', '/facilities/search', undefined, ctx, {
      identifier: queryParams.facilityCode,
      'identifier-type': 'fr-code',
    });
    return this.toResult(envelope, 'VERIFIED', 'NOT_FOUND');
  }

  async checkEligibility(
    request: FhirCoverageEligibilityRequest | EligibilityQuery,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const query = request as EligibilityQuery;
    const identificationNumber = query.nationalId ?? query.memberNumber;
    if (!identificationNumber) {
      throw new DhaApiError('DHA eligibility requires memberNumber or nationalId', 400, false);
    }
    const envelope = await this.call('GET', '/patients/eligibility', undefined, ctx, {
      identification_number: identificationNumber,
      identification_type: query.nationalId ? 'National ID' : 'ClientRegistry ID',
    });
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
    throw new DhaApiError(
      'Generic FHIR Claim submission is not a DHA eClaims request. Use the documented visit, intervention, line, preview and submit workflow.',
      400,
      false,
    );
  }

  async executeEclaims(
    command: DhaEclaimsCommand,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const request = eclaimsRequest(command);
    const envelope = await this.call(
      request.method,
      request.path,
      request.payload,
      ctx,
    );
    return this.toResult(envelope, 'SUCCESS', 'REJECTED');
  }

  async submitAuditEvent(
    event: FhirAuditEvent,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call('POST', 'AuditEvent', event, ctx);
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  async pollClaimResponse(
    claimNumber: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult> {
    const envelope = await this.call(
      'GET',
      '/claims/preview/payer',
      undefined,
      ctx,
      { provider_claim_no: claimNumber },
    );
    return this.toResult(envelope, 'ACCEPTED', 'REJECTED');
  }

  // --- Consent Management ---
  async getPatientContacts(
    patientId: string,
    ctx?: IntegrationCallContext,
  ): Promise<DhaResult<PatientContact[]>> {
    const envelope = await this.call(
      'GET',
      '/patients/contacts',
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
    const envelope = await this.call('POST', '/claims/otp', request, ctx);
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
    const envelope = await this.call('POST', '/claims/authorize', request, ctx);
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
      '/claims/otp/discharge',
      request,
      ctx,
    );
    return this.toResult(
      envelope,
      'SUCCESS',
      'FAILED',
    ) as unknown as DhaResult<SendOtpResponse>;
  }
}
