import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TerminologyGateway } from './terminology-gateway.service';
import { IntegrationConfigService } from '../integration/integration-config.service';

@Injectable()
export class TerminologySyncService {
  private readonly logger = new Logger(TerminologySyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TerminologyGateway,
    private readonly config: IntegrationConfigService,
  ) {}

  /**
   * Performs a synchronization of a specific terminology system and version.
   */
  async synchronizeSystem(
    systemUrl: string,
    version: string,
    mode: 'INITIAL' | 'INCREMENTAL' | 'MANUAL' = 'MANUAL',
  ): Promise<void> {
    if (!this.config.terminologyEnabled) {
      this.logger.warn(
        'Terminology sync skipped because TERMINOLOGY_ENABLED is false',
      );
      return;
    }

    const startTime = Date.now();
    let conceptsAdded = 0;
    let conceptsUpdated = 0;

    const historyRecord = await this.prisma.terminologySyncHistory.create({
      data: {
        syncMode: mode,
        targetSystem: systemUrl,
        status: 'IN_PROGRESS',
      },
    });

    try {
      // 1. Fetch remote version information to see if we need to sync (delta detection)
      // For now, we'll assume we sync everything for the given system and version.

      let offset = 0;
      const limit = this.config.terminologyDefaultPageSize;
      let hasMore = true;

      while (hasMore) {
        const response = await this.gateway.searchConcepts({
          source: systemUrl,
          limit,
          offset,
        });

        const concepts = response.results || [];
        if (concepts.length === 0) {
          hasMore = false;
          break;
        }

        // Upsert each concept in the batch
        for (const remoteConcept of concepts) {
          const upsertResult = await this.upsertConcept(remoteConcept);
          if (upsertResult.isNew) {
            conceptsAdded++;
          } else {
            conceptsUpdated++;
          }
        }

        offset += limit;
        if (offset >= (response.count || 0)) {
          hasMore = false;
        }
      }

      // Update version record
      await this.prisma.terminologyVersion.upsert({
        where: { system_version: { system: systemUrl, version } },
        create: {
          system: systemUrl,
          version,
          isCurrent: true,
          syncedAt: new Date(),
        },
        update: { isCurrent: true, syncedAt: new Date() },
      });

      // Update history record
      await this.prisma.terminologySyncHistory.update({
        where: { id: historyRecord.id },
        data: {
          status: 'SUCCESS',
          conceptsAdded,
          conceptsUpdated,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully synced ${systemUrl} v${version}. Added: ${conceptsAdded}, Updated: ${conceptsUpdated}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync terminology system ${systemUrl}: ${error.message}`,
        error.stack,
      );

      await this.prisma.terminologySyncHistory.update({
        where: { id: historyRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async upsertConcept(
    remoteConcept: any,
  ): Promise<{ isNew: boolean; conceptId: number }> {
    // In a real implementation, we map remote properties to our schema.
    const system = remoteConcept.url || remoteConcept.source;
    const code = remoteConcept.id || remoteConcept.code;
    const version = remoteConcept.version || 'unknown';
    const uuid = remoteConcept.uuid;

    // We must find the source first or create it
    let sourceId: number | null = null;
    if (remoteConcept.source) {
      const source = await this.prisma.terminologySource.upsert({
        where: { sourceId: remoteConcept.source },
        create: {
          sourceId: remoteConcept.source,
          name: remoteConcept.source,
          owner: remoteConcept.owner || 'unknown',
        },
        update: {},
      });
      sourceId = source.id;
    }

    const existingConcept = await this.prisma.terminologyConcept.findUnique({
      where: {
        system_code_version: {
          system,
          code,
          version,
        },
      },
    });

    if (existingConcept) {
      // Update
      const updated = await this.prisma.terminologyConcept.update({
        where: { id: existingConcept.id },
        data: {
          display: remoteConcept.display_name || remoteConcept.display || code,
          conceptClass: remoteConcept.concept_class,
          datatype: remoteConcept.datatype,
          retired: remoteConcept.retired || false,
          owner: remoteConcept.owner || 'unknown',
          metadata: remoteConcept,
        },
      });
      return { isNew: false, conceptId: updated.id };
    } else {
      // Create
      const created = await this.prisma.terminologyConcept.create({
        data: {
          uuid: uuid,
          system,
          code,
          version,
          display: remoteConcept.display_name || remoteConcept.display || code,
          conceptClass: remoteConcept.concept_class,
          datatype: remoteConcept.datatype,
          retired: remoteConcept.retired || false,
          owner: remoteConcept.owner || 'unknown',
          metadata: remoteConcept,
          sourceId,
        },
      });
      return { isNew: true, conceptId: created.id };
    }
  }

  /**
   * Synchronize terminology collections from a remote source.
   * Collections are value sets grouping related concepts.
   */
  async syncCollections(
    sourceUrl: string,
  ): Promise<{ collectionsAdded: number; collectionsUpdated: number }> {
    let collectionsAdded = 0;
    let collectionsUpdated = 0;

    try {
      const response = await this.gateway.searchConcepts({
        source: sourceUrl,
        limit: 100,
        offset: 0,
      });

      const collections = response.results || [];
      for (const remoteCollection of collections) {
        const rc = remoteCollection as any;
        const collectionId = rc.id || rc.uuid;
        if (!collectionId) continue;

        const existing = await this.prisma.terminologyCollection.findUnique({
          where: { collectionId },
        });

        if (existing) {
          await this.prisma.terminologyCollection.update({
            where: { id: existing.id },
            data: {
              name: rc.display_name || rc.name || collectionId,
              description: rc.description,
            },
          });
          collectionsUpdated++;
        } else {
          await this.prisma.terminologyCollection.create({
            data: {
              collectionId,
              name: rc.display_name || rc.name || collectionId,
              description: rc.description,
              owner: rc.owner || 'DHA',
            },
          });
          collectionsAdded++;
        }
      }

      this.logger.log(
        `Collection sync: added ${collectionsAdded}, updated ${collectionsUpdated}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync collections from ${sourceUrl}: ${error.message}`,
        error.stack,
      );
    }

    return { collectionsAdded, collectionsUpdated };
  }

  /**
   * Link concepts to their collections (membership synchronization).
   * This preserves the many-to-many relationship between TerminologyConcept and TerminologyCollection.
   */
  async syncCollectionMemberships(
    collectionId: string,
    conceptCodes: string[],
  ): Promise<number> {
    let linked = 0;

    try {
      const collection = await this.prisma.terminologyCollection.findUnique({
        where: { collectionId },
      });

      if (!collection) {
        this.logger.warn(
          `Collection ${collectionId} not found, skipping membership sync`,
        );
        return 0;
      }

      for (const code of conceptCodes) {
        const concept = await this.prisma.terminologyConcept.findFirst({
          where: { code },
        });

        if (concept) {
          // Connect concept to collection idempotently
          await this.prisma.terminologyCollection.update({
            where: { id: collection.id },
            data: {
              concepts: {
                connect: { id: concept.id },
              },
            },
          });
          linked++;
        }
      }

      this.logger.log(
        `Linked ${linked} concepts to collection ${collectionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync memberships for collection ${collectionId}: ${error.message}`,
        error.stack,
      );
    }

    return linked;
  }
}
