import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  create(
    @Body() dto: CreateAuditLogDto,
    @CurrentUser() user: RequestUser,
    @Req() req: any,
  ) {
    return this.auditLogService.create({
      ...dto,
      actorUserId: dto.actorUserId ?? user.userId,
      actorStaffId: dto.actorStaffId ?? user.staffId ?? undefined,
      facilityId: dto.facilityId ?? user.homeFacilityId ?? undefined,
      branchId: dto.branchId ?? user.homeBranchId ?? undefined,
      ipAddress:
        dto.ipAddress ??
        req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        req.ip,
      userAgent: dto.userAgent ?? req.headers?.['user-agent'],
    });
  }

  @Get()
  findAll(@Query() query: AuditLogQueryDto, @CurrentUser() user: RequestUser) {
    return this.auditLogService.findAllScoped(query, user);
  }

  @Get('export')
  exportAuditLogs(
    @Query() query: AuditLogQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.auditLogService.exportScoped(query, user);
  }

  @Get('module/:moduleName')
  findByModule(
    @Param('moduleName') moduleName: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.auditLogService.findByModuleScoped(moduleName, user);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.auditLogService.findByEntityScoped(entityType, entityId, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.auditLogService.findOneScoped(id, user);
  }
}
