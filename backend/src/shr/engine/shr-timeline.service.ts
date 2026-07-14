import { Injectable, Logger } from '@nestjs/common';
import { ShrPublicationTrigger, ShrPublicationPolicyEngine } from './shr-publication.policy';
import { ShrStateMachine, ShrState } from './shr-state-machine';
import { PrismaService } from '../../prisma/prisma.service';
import { NonRetryableIntegrationError } from '../../integration/integration.types';

@Injectable()
export class ShrTimelineService {
  private readonly logger = new Logger(ShrTimelineService.name);
  constructor(
    private readonly policyEngine: ShrPublicationPolicyEngine,
    private readonly prisma: PrismaService,
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
      throw new NonRetryableIntegrationError(
        'SHR clinical bundle assembly is unavailable until DHA issues a version-pinned clinical exchange/profile contract',
      );

      // 4. Validate Schema & Compliance
      stateMachine.transitionTo(ShrState.VALIDATED);
      await this.updatePublicationState(publication.id, stateMachine.getState());
    } catch (error) {
      this.logger.error(`SHR Pipeline failed: ${error.message}`, error.stack);
      await this.updatePublicationState(publication.id, ShrState.FAILED_VALIDATION);
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
