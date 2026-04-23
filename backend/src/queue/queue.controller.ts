import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QueueService } from './queue.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('queue')
@UseGuards(AuthGuard('jwt'))
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  getFullQueue(@CurrentUser() user: RequestUser) {
    return this.queueService.getFullQueueScoped(user);
  }

  @Get('today')
  getTodayQueue(@CurrentUser() user: RequestUser) {
    return this.queueService.getTodayQueueScoped(user);
  }

  @Get('waiting')
  getWaitingQueue(@CurrentUser() user: RequestUser) {
    return this.queueService.getWaitingQueueScoped(user);
  }

  @Get('doctor/:doctorId')
  getDoctorQueue(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.queueService.getDoctorQueueScoped(doctorId, user);
  }

  @Get('stats')
  getQueueStats(@CurrentUser() user: RequestUser) {
    return this.queueService.getQueueStatsScoped(user);
  }
}
