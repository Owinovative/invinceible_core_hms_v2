/**
 * Event Category: Separates internal domain events from outbound integration events.
 * - DOMAIN: Internal business events (VitalsRecorded, ConsultationCompleted)
 * - INTEGRATION: Events that leave the HMS boundary (ShrPublicationRequested, ClaimSubmissionRequested)
 */
export type EventCategory = 'DOMAIN' | 'INTEGRATION';

/**
 * Event Priority determines Dispatcher processing order.
 */
export type EventPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Governance metadata attached to every event for traceability.
 */
export interface EventGovernance {
  readonly owner: string;
  readonly businessDomain: string;
  readonly introducedVersion: string;
  readonly deprecatedVersion?: string;
  readonly documentationLink?: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly approvalStatus: 'APPROVED' | 'EXPERIMENTAL' | 'DEPRECATED';
}

/**
 * Free-form metadata bag for contextual annotations.
 */
export interface EventMetadata {
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly requestId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;    // OpenTelemetry trace ID
  readonly spanId?: string;     // OpenTelemetry span ID
  [key: string]: unknown;
}

/**
 * The immutable contract that every clinical event must satisfy.
 * Once instantiated and passed to EventPublisher, this object is frozen
 * using Object.freeze() to prevent mutation.
 */
export interface BaseClinicalEvent<TPayload = Record<string, unknown>> {
  // === Identification ===
  readonly eventId: string;          // UUIDv4 — globally unique
  readonly correlationId: string;    // Links events across a single patient workflow

  // === Aggregate (for ordering guarantees) ===
  readonly aggregateId: string;      // e.g., "patient_42" or "encounter_99"
  readonly aggregateType: string;    // e.g., "PATIENT", "ENCOUNTER", "TRIAGE"
  readonly sequenceNumber?: number;  // Monotonically increasing per aggregate

  // === Taxonomy ===
  readonly eventType: string;        // Must match a registered EventRegistry key
  readonly eventCategory: EventCategory;
  readonly eventVersion: number;     // Schema version (1, 2, ...)

  // === Clinical Context ===
  readonly patientId: number;
  readonly encounterId: number | null;
  readonly facilityId: number;
  readonly branchId: number | null;
  readonly tenantId: number;
  readonly userId: number | null;   // Actor who triggered the event

  // === Module Source ===
  readonly sourceModule: string;    // e.g., "TRIAGE", "PHARMACY", "CONSULTATION"

  // === Priority & SLA ===
  readonly priority: EventPriority;
  readonly slaSeconds?: number;     // Max allowed processing seconds

  // === Payload & Security ===
  readonly payload: TPayload;
  readonly signature: string;       // HMAC-SHA256 of (eventId + eventType + timestamp + payload)
  readonly checksum: string;        // SHA-256 hash of payload only (for tamper detection)

  // === Governance ===
  readonly metadata: EventMetadata;
  readonly timestamp: Date;
}
