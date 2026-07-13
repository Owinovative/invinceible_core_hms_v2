import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BundleVersionManager } from '../engine/bundle-version-manager';

@Injectable()
export class ShrBundleRepository {
  private readonly logger = new Logger(ShrBundleRepository.name);
  private readonly prisma = new PrismaClient(); // Simplification

  constructor(private readonly versionManager: BundleVersionManager) {}

  async storeSnapshot(publicationId: number, bundle: any, fhirVersion: string = '4.0.1', profileVersion: string = 'Kenya_SHR_v1'): Promise<any> {
    this.logger.log(`Storing immutable snapshot for publication ${publicationId}`);

    const bundleHash = this.versionManager.generateBundleHash(bundle);

    // Get the current max version for this publication
    const lastSnapshot = await this.prisma.shrBundleSnapshot.findFirst({
      where: { publicationId },
      orderBy: { version: 'desc' },
    });

    const newVersion = lastSnapshot ? lastSnapshot.version + 1 : 1;

    // Create the snapshot
    const snapshot = await this.prisma.shrBundleSnapshot.create({
      data: {
        publicationId,
        version: newVersion,
        fhirVersion,
        profileVersion,
        bundleHash,
        payload: bundle, // Stored natively as JSON in Prisma/PostgreSQL
      }
    });

    this.logger.log(`Stored snapshot ID ${snapshot.id} (Version ${newVersion})`);
    return snapshot;
  }

  async getSnapshotById(id: number): Promise<any> {
    return this.prisma.shrBundleSnapshot.findUnique({
      where: { id }
    });
  }
}
