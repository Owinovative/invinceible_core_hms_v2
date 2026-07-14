import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { ShrState } from './engine/shr-state-machine';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/shr/webhooks')
export class ShrWebhookController {
  private readonly logger = new Logger(ShrWebhookController.name);
  constructor(private readonly prisma: PrismaService) {}

  @Post('dha-callback')
  async handleDhaCallback(
    @Headers('Authorization') authHeader: string,
    @Headers('X-Correlation-ID') correlationId: string,
    @Body() payload: { status?: string; receiptId?: string; message?: string },
  ) {
    if (!correlationId || !payload || typeof payload.status !== 'string') {
      throw new BadRequestException('Callback requires correlation ID and status');
    }

    const configuredSecret = process.env.DHA_WEBHOOK_SECRET;
    const suppliedSecret = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
    if (!configuredSecret || !this.secretsMatch(suppliedSecret, configuredSecret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const attempt = await this.prisma.shrPublicationAttempt.findFirst({
      where: { correlationId }
    });

    if (!attempt) {
      this.logger.error(`No publication attempt found for correlation ID: ${correlationId}`);
      return { status: 'ignored', reason: 'correlation_id_not_found' };
    }

    if (attempt.status !== 'AWAITING_CALLBACK') {
      this.logger.warn(`Attempt ${attempt.id} is in state ${attempt.status}, expected AWAITING_CALLBACK. Ignoring.`);
      return { status: 'ignored', reason: 'invalid_state' };
    }

    // Process callback payload
    const isSuccess = ['ACCEPTED', 'SUCCESS'].includes(payload.status.toUpperCase());
    const newState = isSuccess ? ShrState.COMPLETED : ShrState.REJECTED;

    await this.prisma.shrAcknowledgement.create({
      data: {
        attemptId: attempt.id,
        status: isSuccess ? 'ACCEPTED' : 'REJECTED',
        dhaReceiptId: payload.receiptId,
        message: payload.message,
        payload: payload
      }
    });

    await this.prisma.shrPublicationAttempt.update({
      where: { id: attempt.id },
      data: { status: isSuccess ? 'SUCCESS' : 'FAILED', completedAt: new Date() }
    });

    await this.prisma.shrPublication.update({
      where: { id: attempt.publicationId },
      data: { state: newState }
    });

    this.logger.log(`Successfully processed callback for attempt ${attempt.id}. New State: ${newState}`);
    return { status: 'processed' };
  }

  private secretsMatch(actual: string, expected: string): boolean {
    const actualBytes = Buffer.from(actual);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  }
}
