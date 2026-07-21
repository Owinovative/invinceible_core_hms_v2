import { Injectable, Logger } from '@nestjs/common';
import { SubscribeClinicalEvent } from '../events/subscribers/subscribe.decorator';
import { ClinicalEventTypes } from '../events/registry/event-registry';
import { ShrPublicationTrigger } from './engine/shr-publication.policy';
import { ShrTimelineService } from './engine/shr-timeline.service';
import type { BaseClinicalEvent } from '../events/interfaces/base-clinical-event.interface';

/**
 * ShrEventSubscriber
 *
 * Subscribes to domain clinical events and triggers the SHR publication pipeline.
 * This is the ONLY entry point through which the SHR engine reacts to clinical activity.
 *
 * All outbound SHR publishing ultimately flows through ShrTimelineService →
 * ShrPublisher → IntegrationQueueService → DHA Gateway.
 *
 * No clinical module should call ShrTimelineService directly.
 */
@Injectable()
export class ShrEventSubscriber {
  private readonly logger = new Logger(ShrEventSubscriber.name);

  constructor(private readonly shrTimeline: ShrTimelineService) {}

  /**
   * Reacts to PatientRegistered to kick off the initial SHR demographic record.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.PATIENT_REGISTERED, {
    isolationLevel: 'NORMAL',
  })
  onPatientRegistered(event: BaseClinicalEvent) {
    this.logger.log(
      `[SHR] PatientRegistered received — patient: ${event.patientId}, facility: ${event.facilityId}`,
    );

    // Registration occurs before an explicit DHA sharing authorization can
    // exist. Publishing demographics here would violate consent-by-default.
    this.logger.debug(
      '[SHR] Demographic publication deferred until an authorized clinical event',
    );
  }

  /**
   * Reacts to TriageCompleted to publish vitals/encounter data to SHR.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.TRIAGE_COMPLETED, {
    isolationLevel: 'NORMAL',
  })
  async onTriageCompleted(event: BaseClinicalEvent) {
    this.logger.log(
      `[SHR] TriageCompleted received — patient: ${event.patientId}, triage: ${(event.payload as any)?.triageId}`,
    );

    await this.shrTimeline.triggerPublication(
      ShrPublicationTrigger.TRIAGE_COMPLETED,
      event.patientId,
      event.encounterId ?? undefined,
    );
  }

  /**
   * Reacts to ConsultationCompleted to publish a full clinical record.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.CONSULTATION_COMPLETED, {
    isolationLevel: 'NORMAL',
  })
  async onConsultationCompleted(event: BaseClinicalEvent) {
    this.logger.log(
      `[SHR] ConsultationCompleted received — patient: ${event.patientId}, encounter: ${event.encounterId}`,
    );

    await this.shrTimeline.triggerPublication(
      ShrPublicationTrigger.CONSULTATION_CLOSED,
      event.patientId,
      event.encounterId ?? undefined,
    );
  }

  /**
   * Reacts to ConsentRevoked to immediately suppress/void SHR records.
   * Isolation: CRITICAL — a consent revocation must never be skipped.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.CONSENT_REVOKED, {
    isolationLevel: 'CRITICAL',
  })
  async onConsentRevoked(event: BaseClinicalEvent) {
    this.logger.warn(
      `[SHR] ConsentRevoked received — patient: ${event.patientId}. Triggering SHR record correction.`,
    );

    await this.shrTimeline.suppressPatientPublications(event.patientId);
  }

  /**
   * Reacts to ClaimSubmitted to publish claim + encounter to SHR.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.CLAIM_SUBMITTED, {
    isolationLevel: 'NORMAL',
  })
  async onClaimSubmitted(event: BaseClinicalEvent) {
    this.logger.log(
      `[SHR] ClaimSubmitted received — patient: ${event.patientId}, encounter: ${event.encounterId}`,
    );

    await this.shrTimeline.triggerPublication(
      ShrPublicationTrigger.CLAIM_SUBMITTED,
      event.patientId,
      event.encounterId ?? undefined,
    );
  }
}
