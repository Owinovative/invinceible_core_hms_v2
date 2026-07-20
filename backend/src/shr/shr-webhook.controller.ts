import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DhaCallbackAuthGuard } from '../integration/dha/dha-callback-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DhaShrCallbackDto } from './dto/dha-shr-callback.dto';
import { ShrState } from './engine/shr-state-machine';

@Controller('api/v1/shr/webhooks')
@UseGuards(DhaCallbackAuthGuard)
export class ShrWebhookController {
  private readonly logger = new Logger(ShrWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('dha-callback')
  async handleDhaCallback(
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Body() payload: DhaShrCallbackDto,
  ) {
    if (!correlationId?.trim()) {
      throw new BadRequestException('Missing X-Correlation-ID header');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.shrPublicationAttempt.findFirst({
        where: { correlationId: correlationId.trim() },
      });
      if (!attempt) {
        return { status: 'ignored', reason: 'correlation_id_not_found' };
      }

      const reserved = await tx.shrPublicationAttempt.updateMany({
        where: {
          id: attempt.id,
          status: { in: ['AWAITING_CALLBACK', 'TRANSMITTING'] },
        },
        data: { status: 'PROCESSING_CALLBACK' },
      });
      if (reserved.count !== 1) {
        return { status: 'ignored', reason: 'already_processed' };
      }

      const isSuccess =
        payload.status === 'ACCEPTED' || payload.status === 'SUCCESS';
      await tx.shrAcknowledgement.upsert({
        where: { attemptId: attempt.id },
        create: {
          attemptId: attempt.id,
          status: isSuccess ? 'ACCEPTED' : 'REJECTED',
          dhaReceiptId: payload.receiptId,
          message: payload.message,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });
      await tx.shrPublicationAttempt.update({
        where: { id: attempt.id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
        },
      });
      await tx.shrPublication.update({
        where: { id: attempt.publicationId },
        data: {
          state: isSuccess ? ShrState.COMPLETED : ShrState.REJECTED,
        },
      });
      return { status: 'processed' };
    });

    if (result.status === 'processed') {
      this.logger.log('Processed authenticated DHA SHR callback');
    }
    return result;
  }
}
