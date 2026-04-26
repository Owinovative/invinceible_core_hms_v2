import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { PreciseLocationDto } from './dto/precise-location.dto';
import { UserLocationService } from './user-location.service';

@Controller('user-locations')
@UseGuards(AuthGuard('jwt'))
export class UserLocationController {
  constructor(private readonly userLocationService: UserLocationService) {}

  @Post('logout')
  markLogout(@CurrentUser() user: RequestUser, @Req() req: any) {
    return this.userLocationService.markLogout(user, req);
  }

  @Post('precise')
  recordPreciseLocation(
    @Body() dto: PreciseLocationDto,
    @CurrentUser() user: RequestUser,
    @Req() req: any,
  ) {
    return this.userLocationService.recordPreciseLocation(user, dto, req);
  }

  @Get('platform/overview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  getPlatformOverview() {
    return this.userLocationService.getPlatformOverview();
  }

  @Get('platform/events')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  getPlatformEvents(@Query('take') take?: string) {
    return this.userLocationService.getPlatformEvents(Number(take) || 150);
  }
}
