import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(AuthGuard('jwt'))
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() dto: CreateFeedbackDto, @CurrentUser() user: RequestUser) {
    return this.feedbackService.create(dto, user);
  }

  @Get('mine')
  findMine(@CurrentUser() user: RequestUser) {
    return this.feedbackService.findMine(user);
  }

  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  findPlatform() {
    return this.feedbackService.findPlatform();
  }

  @Patch(':id/reply')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyFeedbackDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.reply(id, dto, user);
  }
}
