import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShrPublisher } from '../shr-publisher.service';

@Injectable()
export class DeadLetterRecoveryService {
  private readonly logger = new Logger(DeadLetterRecoveryService.name);
  constructor(
    private readonly publisher: ShrPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async getDeadLetters(limit: number = 50) {
    return this.prisma.shrPublicationAttempt.findMany({
      where: { status: 'DEAD_LETTER' },
      include: {
        publication: true,
        errors: true,
      },
      take: limit,
      orderBy: { startedAt: 'desc' },
    });
  }

  async replayDeadLetter(attemptId: number) {
    this.logger.log(
      `Admin requested replay of dead letter attempt ${attemptId}`,
    );

    const attempt = await this.prisma.shrPublicationAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    if (attempt.status !== 'DEAD_LETTER') {
      throw new BadRequestException(
        `Attempt ${attemptId} is not in DEAD_LETTER state`,
      );
    }

    await this.prisma.shrPublication.update({
      where: { id: attempt.publicationId },
      data: { state: 'QUEUED' },
    });

    return this.publisher.publishBundle(
      attempt.publicationId,
      attempt.snapshotId,
    );
  }
}
