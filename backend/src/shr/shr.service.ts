import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ShrService {
  private readonly logger = new Logger(ShrService.name);
  private readonly prisma = new PrismaClient(); // Simplification, would typically inject a central PrismaService

  async getMetrics() {
    return {
      totalPublications: await this.prisma.shrPublication.count(),
      successfulCount: await this.prisma.shrPublicationAttempt.count({ where: { status: 'SUCCESS' } }),
      failedCount: await this.prisma.shrPublicationAttempt.count({ where: { status: 'FAILED' } }),
    };
  }

  async getPublicationById(id: number) {
    return this.prisma.shrPublication.findUnique({
      where: { id },
      include: {
        snapshots: true,
        attempts: true,
        dependencies: true,
      },
    });
  }
}
