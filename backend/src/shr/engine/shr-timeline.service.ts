import { Injectable, Logger } from '@nestjs/common';
import { ShrPublicationTrigger, ShrPublicationPolicyEngine } from './shr-publication.policy';
import { ShrStateMachine, ShrState } from './shr-state-machine';
import { ShrBundleAssembler } from '../fhir/fhir-bundle-assembler';
import { ShrBundleValidator } from '../validation/fhir-bundle-validator';
import { ShrBundleRepository } from '../repository/shr-bundle.repository';
import { ShrPublisher } from '../shr-publisher.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ShrTimelineService {
  private readonly logger = new Logger(ShrTimelineService.name);
  private readonly prisma = new PrismaClient(); // Simplified

  constructor(
    private readonly policyEngine: ShrPublicationPolicyEngine,
    // ... inject assemblers, validators, repository, publisher
  ) {}

  /**
   * Triggers the SHR publication pipeline for a specific clinical event.
   * This is the entry point for the timeline.
   */
  async triggerPublication(trigger: ShrPublicationTrigger, patientId: number, encounterId?: number) {
    this.logger.log(`Triggering SHR Publication. Trigger: ${trigger}, Patient: ${patientId}, Encounter: ${encounterId}`);

    // 1. Determine Policy
    const policy = this.policyEngine.determinePolicy(trigger, { patientId, encounterId });
    const requiredResources = this.policyEngine.getRequiredResourcesForPolicy(policy);
    
    this.logger.log(`Determined Policy: ${policy}. Required Resources: ${requiredResources.join(', ')}`);

    // 2. Initialize State Machine
    const stateMachine = new ShrStateMachine(ShrState.CREATED);
    
    // Create Publication Intent in DB
    const publication = await this.prisma.shrPublication.create({
      data: {
        patientId,
        encounterId,
        policy,
        state: stateMachine.getState(),
      }
    });

    try {
      // 3. Assemble Bundle
      stateMachine.transitionTo(ShrState.ASSEMBLING);
      await this.updatePublicationState(publication.id, stateMachine.getState());
      // const bundle = await this.assembler.assemble(patientId, encounterId, requiredResources);

      // 4. Validate Schema & Compliance
      stateMachine.transitionTo(ShrState.VALIDATED);
      await this.updatePublicationState(publication.id, stateMachine.getState());
      // await this.validator.validate(bundle, policy);
      
      stateMachine.transitionTo(ShrState.COMPLIANT);
      await this.updatePublicationState(publication.id, stateMachine.getState());

      // 5. Store Snapshot
      stateMachine.transitionTo(ShrState.STORED_IN_REPO);
      await this.updatePublicationState(publication.id, stateMachine.getState());
      // const snapshot = await this.repository.storeSnapshot(publication.id, bundle);

      // 6. Queue for Publishing
      stateMachine.transitionTo(ShrState.QUEUED);
      await this.updatePublicationState(publication.id, stateMachine.getState());
      // await this.publisher.publishBundle(snapshot.id, bundle);

    } catch (error) {
      this.logger.error(`SHR Pipeline failed: ${error.message}`, error.stack);
      // Handle failure state transitions (FAILED_VALIDATION, FAILED_COMPLIANCE, etc)
      // await this.updatePublicationState(publication.id, ShrState.FAILED_VALIDATION);
      throw error;
    }
  }

  private async updatePublicationState(id: number, state: ShrState) {
    await this.prisma.shrPublication.update({
      where: { id },
      data: { state }
    });
  }
}
