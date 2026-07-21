import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShrService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(facilityId: number) {
    const publicationScope = { patient: { facilityId } };
    return {
      totalPublications: await this.prisma.shrPublication.count({
        where: publicationScope,
      }),
      successfulCount: await this.prisma.shrPublicationAttempt.count({
        where: { status: 'SUCCESS', publication: publicationScope },
      }),
      failedCount: await this.prisma.shrPublicationAttempt.count({
        where: { status: 'FAILED', publication: publicationScope },
      }),
    };
  }

  async getPublicationById(id: number, facilityId: number) {
    const publication = await this.prisma.shrPublication.findFirst({
      where: { id, patient: { facilityId } },
      include: {
        snapshots: true,
        attempts: true,
        dependencies: true,
      },
    });
    if (!publication) {
      throw new NotFoundException('SHR publication not found');
    }
    return publication;
  }
}
