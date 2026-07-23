import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from './audit-log.service';
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
