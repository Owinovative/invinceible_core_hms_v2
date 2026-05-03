import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserReviewService } from './user-review.service';
import { UpsertUserReviewDto } from './dto/upsert-user-review.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('reviews')
export class UserReviewController {
  constructor(private readonly userReviewService: UserReviewService) {}

  @Get('public')
  findPublicReviews() {
    return this.userReviewService.findPublicReviews();
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMyReviewStatus(@CurrentUser() user: RequestUser) {
    return this.userReviewService.getMyReviewStatus(user);
  }

  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  upsertMyReview(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertUserReviewDto,
  ) {
    return this.userReviewService.upsertMyReview(user, dto);
  }
}
