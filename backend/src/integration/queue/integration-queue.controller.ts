import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { IntegrationQueueService } from './integration-queue.service';
import { OUTBOUND_STATUS } from '../integration.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('integrations/queue')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class IntegrationQueueController {
  constructor(
    private readonly queueService: IntegrationQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @Permissions('billing.read')
  async getHealth() {
    return this.queueService.getStats();
  }

  @Get('stats')
  @Permissions('billing.read')
  async getStats() {
    return this.queueService.getStats();
  }

  @Get('dead-letters')
  @Permissions('billing.read')
  async getDeadLetters(@Query('integration') integration?: string) {
    return this.prisma.integrationOutboundRequest.findMany({
      where: {
        status: OUTBOUND_STATUS.DEAD_LETTER,
        ...(integration ? { integration } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  @Post(':id/requeue')
  @Permissions('billing.write')
  async requeueDeadLetter(@Param('id', ParseIntPipe) id: number) {
    const success = await this.queueService.requeueDeadLetter(id);
    return { success, id };
  }
}
