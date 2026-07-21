import { Injectable, Logger } from '@nestjs/common';
import {
  ShrPublicationTrigger,
  ShrPublicationPolicyEngine,
} from './shr-publication.policy';
import { ShrStateMachine, ShrState } from './shr-state-machine';
import { ShrBundleAssembler } from '../fhir/fhir-bundle-assembler';
import { ShrBundleValidator } from '../validation/fhir-bundle-validator';
import { DhaComplianceEngine } from '../validation/dha-compliance-engine';
import { ShrBundleRepository } from '../repository/shr-bundle.repository';
import { ShrPublisher } from '../shr-publisher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConfigService } from '../../integration/integration-config.service';

@Injectable()
export class ShrTimelineService {
  private readonly logger = new Logger(ShrTimelineService.name);
  constructor(
    private readonly policyEngine: ShrPublicationPolicyEngine,
    private readonly assembler: ShrBundleAssembler,
    private readonly validator: ShrBundleValidator,
    private readonly compliance: DhaComplianceEngine,
    private readonly repository: ShrBundleRepository,
    private readonly publisher: ShrPublisher,
    private readonly prisma: PrismaService,
    private readonly integrationConfig: IntegrationConfigService,
  ) {}

  /**
   * Triggers the SHR publication pipeline for a specific clinical event.
   * This is the entry point for the timeline.
   */
  async triggerPublication(
    trigger: ShrPublicationTrigger,
    patientId: number,
    encounterId?: number,
  ) {
    if (!this.integrationConfig.shrEnabled) {
      return { skipped: true as const, reason: 'SHR_DISABLED' };
    }
    this.logger.log(
      `Triggering SHR Publication. Trigger: ${trigger}, Patient: ${patientId}, Encounter: ${encounterId}`,
    );

    // 1. Determine Policy
    const policy = this.policyEngine.determinePolicy(trigger, {
      patientId,
      encounterId,
    });
    const requiredResources =
      this.policyEngine.getRequiredResourcesForPolicy(policy);

    this.logger.log(
      `Determined Policy: ${policy}. Required Resources: ${requiredResources.join(', ')}`,
    );

    // 2. Initialize State Machine
    const stateMachine = new ShrStateMachine(ShrState.CREATED);

    // Create Publication Intent in DB
    const publication = await this.prisma.shrPublication.create({
      data: {
        patientId,
        encounterId,
        policy,
        state: stateMachine.getState(),
      },
    });

    let phase: 'ASSEMBLY' | 'VALIDATION' | 'COMPLIANCE' | 'PUBLISH' =
      'ASSEMBLY';
    try {
      // 3. Assemble Bundle
      stateMachine.transitionTo(ShrState.ASSEMBLING);
      await this.updatePublicationState(
        publication.id,
        stateMachine.getState(),
      );
      const bundle = await this.assembler.assemble(
        patientId,
        encounterId,
        requiredResources,
      );

      // 4. Validate Schema & Compliance
      phase = 'VALIDATION';
      this.validator.validate(bundle);
      stateMachine.transitionTo(ShrState.VALIDATED);
      await this.updatePublicationState(
        publication.id,
        stateMachine.getState(),
      );

      phase = 'COMPLIANCE';
      await this.compliance.validateCompliance(bundle, policy, patientId);
      stateMachine.transitionTo(ShrState.COMPLIANT);
      await this.updatePublicationState(
        publication.id,
        stateMachine.getState(),
      );

      // 5. Store Snapshot
      stateMachine.transitionTo(ShrState.STORED_IN_REPO);
      await this.updatePublicationState(
        publication.id,
        stateMachine.getState(),
      );
      const snapshot = await this.repository.storeSnapshot(
        publication.id,
        bundle,
      );

      // 6. Queue for Publishing
      stateMachine.transitionTo(ShrState.QUEUED);
      await this.updatePublicationState(
        publication.id,
        stateMachine.getState(),
      );
      phase = 'PUBLISH';
      await this.publisher.publishBundle(publication.id, snapshot.id);

      return this.prisma.shrPublication.findUnique({
        where: { id: publication.id },
      });
    } catch (error) {
      this.logger.error(`SHR Pipeline failed: ${error.message}`, error.stack);
      const failedState =
        phase === 'COMPLIANCE'
          ? ShrState.FAILED_COMPLIANCE
          : phase === 'PUBLISH'
            ? ShrState.RETRY_PENDING
            : ShrState.FAILED_VALIDATION;
      await this.updatePublicationState(publication.id, failedState);
      throw error;
    }
  }

  async suppressPatientPublications(patientId: number) {
    return this.prisma.shrPublication.updateMany({
      where: {
        patientId,
        state: {
          notIn: ['COMPLETED', 'REJECTED', 'CANCELLED_CONSENT_REVOKED'],
        },
      },
      data: { state: 'CANCELLED_CONSENT_REVOKED' },
    });
  }

  private async updatePublicationState(id: number, state: ShrState) {
    await this.prisma.shrPublication.update({
      where: { id },
      data: { state },
    });
  }
}
