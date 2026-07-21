import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
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
  getFullQueue(
    @CurrentUser() user: RequestUser,
    @Query('branchId') branchIdValue?: string,
  ) {
    return this.queueService.getFullQueueScoped(
      user,
      this.parseBranchId(branchIdValue),
    );
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
  getQueueStats(
    @CurrentUser() user: RequestUser,
    @Query('branchId') branchIdValue?: string,
  ) {
    return this.queueService.getQueueStatsScoped(
      user,
      this.parseBranchId(branchIdValue),
    );
  }

  private parseBranchId(value?: string): number | undefined {
    if (value === undefined || value === '') return undefined;
    const branchId = Number(value);
    if (!Number.isInteger(branchId) || branchId <= 0) {
      throw new BadRequestException('branchId must be a positive integer');
    }
    return branchId;
  }
}
