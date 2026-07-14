import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShrPublisher } from '../shr-publisher.service';

@Injectable()
export class DeadLetterRecoveryService {
  private readonly logger = new Logger(DeadLetterRecoveryService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ShrPublisher,
  ) {}

  async getDeadLetters(limit: number = 50) {
    return this.prisma.shrPublicationAttempt.findMany({
      where: { status: 'DEAD_LETTER' },
      include: {
        publication: true,
        errors: true,
      },
      take: limit,
      orderBy: { startedAt: 'desc' }
    });
  }

  async replayDeadLetter(attemptId: number) {
    this.logger.log(`Admin requested replay of dead letter attempt ${attemptId}`);
    
    const attempt = await this.prisma.shrPublicationAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    if (attempt.status !== 'DEAD_LETTER') {
      throw new Error(`Attempt ${attemptId} is not in DEAD_LETTER state`);
    }

    // Move state back to QUEUED
    await this.prisma.shrPublicationAttempt.update({
      where: { id: attemptId },
      data: { status: 'QUEUED' }
    });

    await this.prisma.shrPublication.update({
      where: { id: attempt.publicationId },
      data: { state: 'QUEUED' }
    });

    // Re-queue
    return this.publisher.publishBundle(attempt.snapshotId);
  }
}
