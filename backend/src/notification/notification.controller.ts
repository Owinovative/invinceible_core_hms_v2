import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { ResolveNotificationDto } from './dto/resolve-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: RequestUser) {
    return this.notificationService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.findAllScoped(user, query);
  }

  @Get('stats')
  getStats(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.getNotificationStats(user, query);
  }

  @Get('recipients')
  getRecipients(@CurrentUser() user: RequestUser) {
    return this.notificationService.getRecipients(user);
  }

  @Get('branch-alerts')
  getBranchAlerts(
    @Query('facilityId') facilityId: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.getBranchAlerts(
      user.homeFacilityId!,
      user.canAccessAllBranchesInFacility
        ? (branchId ? Number(branchId) : undefined)
        : (user.homeBranchId ?? undefined),
    );
  }

  @Get('pharmacy-alerts')
  getPharmacyAlerts(
    @Query('facilityId') facilityId: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.getPharmacyAlerts(
      user.homeFacilityId!,
      user.canAccessAllBranchesInFacility
        ? (branchId ? Number(branchId) : undefined)
        : (user.homeBranchId ?? undefined),
    );
  }

  @Get('unresolved-count')
  getUnresolvedCount(
    @Query('moduleName') moduleName: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.getUnresolvedCount(
      user.homeFacilityId!,
      user.canAccessAllBranchesInFacility
        ? undefined
        : (user.homeBranchId ?? undefined),
      moduleName,
    );
  }

  @Get('pharmacist-dashboard/:staffId')
  getPharmacistDashboardAlerts(
    @Param('staffId', ParseIntPipe) staffId: number,
  ) {
    return this.notificationService.getPharmacistDashboardAlerts(staffId);
  }

  @Get('cashier-dashboard/:staffId')
  getCashierDashboardAlerts(
    @Param('staffId', ParseIntPipe) staffId: number,
  ) {
    return this.notificationService.getCashierDashboardAlerts(staffId);
  }

  @Get('admin-operations/:userId')
  getAdminOperationsAlerts(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.notificationService.getAdminOperationsAlerts(userId);
  }

  @Get('user/:userId')
  findForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationService.findForUser(userId);
  }

  @Get('staff/:staffId')
  findForStaff(@Param('staffId', ParseIntPipe) staffId: number) {
    return this.notificationService.findForStaff(staffId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.findOneScoped(id, user);
  }

  @Patch('read-all')
  markScopedAsRead(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.markScopedAsRead(user, query);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.markAsRead(id, user);
  }

  @Patch(':id/resolve')
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveNotificationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.resolve(id, dto, user);
  }

  @Patch('staff/:staffId/read-all')
  markAllForStaffAsRead(@Param('staffId', ParseIntPipe) staffId: number) {
    return this.notificationService.markAllForStaffAsRead(staffId);
  }

  @Patch('user/:userId/read-all')
  markAllForUserAsRead(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationService.markAllForUserAsRead(userId);
  }
}
