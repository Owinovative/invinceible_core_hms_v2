import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateShaClaimDto } from './dto/create-sha-claim.dto';
import { UpdateShaClaimDto } from './dto/update-sha-claim.dto';
import { ShaClaimsService } from './sha-claims.service';

@Controller('sha-claims')
@UseGuards(AuthGuard('jwt'))
export class ShaClaimsController {
  constructor(private readonly shaClaimsService: ShaClaimsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.shaClaimsService.findAll(user);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.shaClaimsService.getSummary(user);
  }

  @Get(':id/pdf')
  async downloadClaimPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.shaClaimsService.getClaimPdf(id, user);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="sha-claim-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    response.end(pdf);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  create(@Body() dto: CreateShaClaimDto, @CurrentUser() user: RequestUser) {
    return this.shaClaimsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShaClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.shaClaimsService.update(id, dto, user);
  }

  /**
   * Billing staff endpoint — updates only the statusCode of a claim.
   * A cashier or billing officer can advance a claim through the workflow
   * (DRAFT → SUBMITTED → ACCEPTED → PAID) without needing ADMIN role.
   */
  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('billing.read')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { statusCode: string; rejectionReason?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.shaClaimsService.update(
      id,
      {
        statusCode: body.statusCode,
        rejectionReason: body.rejectionReason ?? null,
      } as UpdateShaClaimDto,
      user,
    );
  }

  /**
   * Manually trigger DHA submission for a claim that is in DRAFT or
   * has previously failed. Idempotent — the outbound queue deduplicates
   * via idempotency keys so re-triggering is safe.
   */
  @Post(':id/submit-to-dha')
  @UseGuards(PermissionsGuard)
  @Permissions('billing.read')
  submitToDha(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.shaClaimsService.submitToDha(id, user);
  }
}
