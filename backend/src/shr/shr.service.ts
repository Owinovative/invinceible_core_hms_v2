import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShrService {
  private readonly logger = new Logger(ShrService.name);
  constructor(private readonly prisma: PrismaService) {}

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
