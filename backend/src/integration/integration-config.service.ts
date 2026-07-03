import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IntegrationMode = 'mock' | 'sandbox' | 'production';

/**
 * Typed access to every integration-related environment variable.
 * Secrets are read lazily and never exposed through logging paths.
 */
@Injectable()
export class IntegrationConfigService {
  constructor(private readonly config: ConfigService) {}

  private str(key: string, fallback = ''): string {
    const value = this.config.get<string>(key);
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : fallback;
  }

  private num(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private bool(key: string, fallback: boolean): boolean {
    const value = this.config.get<string>(key);
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
  }

  private mode(key: string): IntegrationMode {
    const value = this.str(key, 'mock').toLowerCase();
    return value === 'sandbox' || value === 'production'
      ? (value as IntegrationMode)
      : 'mock';
  }

  // --- KRA eTIMS -----------------------------------------------------------

  get etimsEnabled(): boolean {
    return this.bool('ETIMS_ENABLED', false);
  }

  get etimsMode(): IntegrationMode {
    return this.mode('ETIMS_MODE');
  }

  get etimsBaseUrl(): string {
    return this.str('ETIMS_BASE_URL');
  }

  get etimsTin(): string {
    return this.str('ETIMS_TIN');
  }

  get etimsBranchId(): string {
    return this.str('ETIMS_BHF_ID', '00');
  }

  get etimsCmcKey(): string {
    return this.str('ETIMS_CMC_KEY');
  }

  get etimsDeviceSerial(): string {
    return this.str('ETIMS_DEVICE_SERIAL');
  }

  get etimsTimeoutMs(): number {
    return this.num('ETIMS_TIMEOUT_MS', 15_000);
  }

  get etimsMaxAttempts(): number {
    return this.num('ETIMS_MAX_ATTEMPTS', 8);
  }

  /** KRA tax type for medical services. 'A' = VAT exempt. */
  get etimsDefaultTaxCode(): string {
    return this.str('ETIMS_DEFAULT_TAX_CODE', 'A').toUpperCase();
  }

  get etimsVatRatePercent(): number {
    return this.num('ETIMS_VAT_RATE', 16);
  }

  get etimsReceiptBaseUrl(): string {
    return this.str(
      'ETIMS_RECEIPT_VERIFY_URL',
      this.etimsMode === 'production'
        ? 'https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData'
        : 'https://etims-sbx.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData',
    );
  }

  // --- DHA -----------------------------------------------------------------

  get dhaEnabled(): boolean {
    return this.bool('DHA_ENABLED', false);
  }

  get dhaMode(): IntegrationMode {
    return this.mode('DHA_MODE');
  }

  get dhaBaseUrl(): string {
    return this.str('DHA_BASE_URL');
  }

  get dhaApiVersion(): string {
    return this.str('DHA_API_VERSION', 'v1');
  }

  get dhaTokenUrl(): string {
    return this.str('DHA_TOKEN_URL');
  }

  get dhaClientId(): string {
    return this.str('DHA_CLIENT_ID');
  }

  get dhaClientSecret(): string {
    return this.str('DHA_CLIENT_SECRET');
  }

  get dhaFacilityCode(): string {
    return this.str('DHA_FACILITY_CODE');
  }

  get dhaTimeoutMs(): number {
    return this.num('DHA_TIMEOUT_MS', 15_000);
  }

  get dhaMaxAttempts(): number {
    return this.num('DHA_MAX_ATTEMPTS', 8);
  }

  // --- Queue worker --------------------------------------------------------

  get workerEnabled(): boolean {
    return this.bool('INTEGRATION_WORKER_ENABLED', true);
  }

  get workerPollMs(): number {
    return this.num('INTEGRATION_WORKER_POLL_MS', 5_000);
  }

  get workerBatchSize(): number {
    return this.num('INTEGRATION_QUEUE_BATCH_SIZE', 10);
  }

  get retryBaseDelayMs(): number {
    return this.num('INTEGRATION_RETRY_BASE_DELAY_MS', 30_000);
  }

  get retryMaxDelayMs(): number {
    return this.num('INTEGRATION_RETRY_MAX_DELAY_MS', 3_600_000);
  }

  /** PROCESSING rows older than this are considered crashed and recovered. */
  get stuckRequestMs(): number {
    return this.num('INTEGRATION_STUCK_REQUEST_MS', 600_000);
  }

  get anyIntegrationEnabled(): boolean {
    return this.etimsEnabled || this.dhaEnabled;
  }
}
