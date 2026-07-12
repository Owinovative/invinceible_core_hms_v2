import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class RetryCoordinator {
  private readonly logger = new Logger(RetryCoordinator.name);
  private readonly prisma = new PrismaClient();

  async scheduleRetry(attemptId: number, error: any, currentRetryCount: number, maxRetries: number = 5) {
    if (currentRetryCount >= maxRetries) {
      this.logger.warn(`Max retries reached for attempt ${attemptId}. Moving to Dead Letter Queue.`);
      return this.moveToDeadLetter(attemptId, error);
    }

    const backoffMs = Math.pow(2, currentRetryCount) * 1000; // Exponential backoff
    this.logger.log(`Scheduling retry for attempt ${attemptId} in ${backoffMs}ms`);

    // In BullMQ, this is handled by throwing an error in the processor and letting BullMQ backoff.
    // However, we explicitly track state in our DB.
    await this.prisma.shrPublicationAttempt.update({
      where: { id: attemptId },
      data: { status: 'RETRY_PENDING' }
    });

    // Update parent publication state
    const attempt = await this.prisma.shrPublicationAttempt.findUnique({ where: { id: attemptId }});
    if (attempt) {
      await this.prisma.shrPublication.update({
        where: { id: attempt.publicationId },
        data: { state: 'RETRY_PENDING' }
      });
    }
  }

  private async moveToDeadLetter(attemptId: number, error: any) {
    await this.prisma.shrPublicationError.create({
      data: {
        attemptId,
        errorType: 'MAX_RETRIES_EXCEEDED',
        message: error.message || 'Unknown error',
        details: error.stack ? { stack: error.stack } : undefined,
      }
    });

    await this.prisma.shrPublicationAttempt.update({
      where: { id: attemptId },
      data: { status: 'DEAD_LETTER' }
    });

    const attempt = await this.prisma.shrPublicationAttempt.findUnique({ where: { id: attemptId }});
    if (attempt) {
      await this.prisma.shrPublication.update({
        where: { id: attempt.publicationId },
        data: { state: 'DEAD_LETTER' }
      });
    }
  }
}
