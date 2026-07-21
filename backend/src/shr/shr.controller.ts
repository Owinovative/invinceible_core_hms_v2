import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ShrService } from './shr.service';

@Controller('api/v1/shr')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('patient.read', 'audit.read')
export class ShrController {
  constructor(private readonly shrService: ShrService) {}

  @Get('metrics')
  async getMetrics(@CurrentUser() user: RequestUser) {
    return this.shrService.getMetrics(this.requireFacilityId(user));
  }

  @Get('publications/:id')
  async getPublication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.shrService.getPublicationById(id, this.requireFacilityId(user));
  }

  private requireFacilityId(user: RequestUser): number {
    if (!user.homeFacilityId) {
      throw new ForbiddenException('A facility-scoped account is required');
    }
    return user.homeFacilityId;
  }
}
