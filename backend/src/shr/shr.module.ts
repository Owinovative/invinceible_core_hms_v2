import { Module } from '@nestjs/common';
import { ShrController } from './shr.controller';
import { ShrWebhookController } from './shr-webhook.controller';
import { ShrService } from './shr.service';
import { ShrPublisher } from './shr-publisher.service';
import { ShrStartupValidator } from './shr-startup-validator';
import { TerminologyModule } from '../terminology/terminology.module';
import { ConsentModule } from '../consent/consent.module';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';

// Engine
import { ShrPublicationPolicyEngine } from './engine/shr-publication.policy';
import { ShrTimelineService } from './engine/shr-timeline.service';
import { BundleVersionManager, BundleComparator } from './engine/bundle-version-manager';

// FHIR
import { ShrResourceCapabilityRegistry } from './fhir/shr-resource-registry';
import { ShrBundleAssembler } from './fhir/fhir-bundle-assembler';
import {
  PatientBuilder,
  OrganizationBuilder,
  PractitionerBuilder,
  EncounterBuilder,
  ConditionBuilder,
  ObservationBuilder,
  ProcedureBuilder,
  MedicationRequestBuilder,
  DiagnosticReportBuilder,
  ProvenanceBuilder,
} from './fhir/builders';

// Validation
import { FhirProfileRegistry } from './validation/fhir-profile-registry';
import { ShrBundleValidator } from './validation/fhir-bundle-validator';
import { DhaComplianceEngine } from './validation/dha-compliance-engine';

// Repository
import { ShrBundleRepository } from './repository/shr-bundle.repository';

// Workers
import { RetryCoordinator } from './workers/retry-coordinator.service';
import { DeadLetterRecoveryService } from './workers/dead-letter.service';

// Event Bus Subscriber
import { ShrEventSubscriber } from './shr-event-subscriber';

@Module({
  imports: [
    TerminologyModule,
    ConsentModule,
    IntegrationModule,
    PrismaModule,
  ],
  controllers: [
    ShrController,
    ShrWebhookController,
  ],
  providers: [
    // Core Services
    ShrService,
    ShrPublisher,
    ShrStartupValidator,

    // Engine
    ShrPublicationPolicyEngine,
    ShrTimelineService,
    BundleVersionManager,
    BundleComparator,

    // FHIR Infrastructure
    ShrResourceCapabilityRegistry,
    ShrBundleAssembler,

    // FHIR Builders
    PatientBuilder,
    OrganizationBuilder,
    PractitionerBuilder,
    EncounterBuilder,
    ConditionBuilder,
    ObservationBuilder,
    ProcedureBuilder,
    MedicationRequestBuilder,
    DiagnosticReportBuilder,
    ProvenanceBuilder,

    // Validation
    FhirProfileRegistry,
    ShrBundleValidator,
    DhaComplianceEngine,

    // Repository
    ShrBundleRepository,

    // Workers
    RetryCoordinator,
    DeadLetterRecoveryService,

    // Event Bus Subscribers
    ShrEventSubscriber,
  ],
  exports: [ShrService, ShrTimelineService],
})
export class ShrModule {}
