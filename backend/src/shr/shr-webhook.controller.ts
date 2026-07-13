import { Controller, Post, Body, Headers, Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ShrStateMachine, ShrState } from './engine/shr-state-machine';

@Controller('api/v1/shr/webhooks')
export class ShrWebhookController {
  private readonly logger = new Logger(ShrWebhookController.name);
  private readonly prisma = new PrismaClient();

  @Post('dha-callback')
  async handleDhaCallback(
    @Headers('Authorization') authHeader: string,
    @Headers('X-Correlation-ID') correlationId: string,
    @Body() payload: any
  ) {
    this.logger.log(`Received DHA Webhook Callback for Correlation ID: ${correlationId}`);

    // Basic Callback Authentication - in reality, verify JWT signature from DHA
    if (authHeader !== `Bearer ${process.env.DHA_WEBHOOK_SECRET}`) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!correlationId) {
      throw new Error('Missing X-Correlation-ID header');
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
    const isSuccess = payload.status === 'ACCEPTED' || payload.status === 'SUCCESS';
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
}
