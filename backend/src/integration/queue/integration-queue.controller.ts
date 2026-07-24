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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';

@Controller('integrations/queue')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class IntegrationQueueController {
  constructor(private readonly queueService: IntegrationQueueService) {}

  @Get('health')
  @Permissions('billing.read')
  async getHealth(@CurrentUser() user: RequestUser) {
    return this.queueService.getStatsScoped(user);
  }

  @Get('stats')
  @Permissions('billing.read')
  async getStats(@CurrentUser() user: RequestUser) {
    return this.queueService.getStatsScoped(user);
  }

  @Get('dead-letters')
  @Permissions('billing.read')
  async getDeadLetters(
    @CurrentUser() user: RequestUser,
    @Query('integration') integration?: string,
  ) {
    return this.queueService.listDeadLettersScoped(user, integration);
  }

  @Post(':id/requeue')
  @Permissions('billing.write')
  async requeueDeadLetter(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    const success = await this.queueService.requeueDeadLetterScoped(id, user);
    return { success, id };
  }
}
