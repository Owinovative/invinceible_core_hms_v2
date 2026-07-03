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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import type { RequestWithContext } from '../../resilience/request-context.middleware';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import {
  CancelEtimsInvoiceDto,
  CreateEtimsAmendmentDto,
} from './dto/etims-amendment.dto';
import { EtimsService } from './etims.service';

@Controller('integrations/etims')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class EtimsController {
  constructor(
    private readonly etimsService: EtimsService,
    private readonly queueService: IntegrationQueueService,
    private readonly config: IntegrationConfigService,
  ) {}

  @Get('status')
  @Permissions('billing.read')
  async getStatus() {
    return {
      enabled: this.config.etimsEnabled,
      mode: this.config.etimsMode,
      queue: await this.queueService.getStats(),
    };
  }

  @Get('invoices/:invoiceId')
  @Permissions('billing.read')
  getInvoiceFiscalStatus(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.etimsService.getInvoiceFiscalStatus(invoiceId);
  }

  @Post('invoices/:invoiceId/submit')
  @Permissions('billing.write')
  submitInvoice(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.etimsService.onBillingFinalized(invoiceId, {
      correlationId: req.requestId,
      trigger: 'MANUAL_SUBMIT',
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });
  }

  @Post('invoices/:invoiceId/credit-note')
  @Permissions('billing.write')
  createCreditNote(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: CreateEtimsAmendmentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.etimsService.createCreditNote(invoiceId, {
      reason: dto.reason,
      itemIds: dto.itemIds,
      correlationId: req.requestId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });
  }

  @Post('invoices/:invoiceId/debit-note')
  @Permissions('billing.write')
  createDebitNote(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: CreateEtimsAmendmentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.etimsService.createDebitNote(invoiceId, {
      reason: dto.reason,
      itemIds: dto.itemIds,
      correlationId: req.requestId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });
  }

  @Post('invoices/:invoiceId/cancel')
  @Permissions('billing.write')
  cancelInvoice(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: CancelEtimsInvoiceDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.etimsService.cancelInvoice(invoiceId, {
      reason: dto.reason,
      correlationId: req.requestId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });
  }

  @Post('sync')
  @Permissions('billing.write')
  syncNow() {
    return this.etimsService.syncNow();
  }

  @Get('queue/dead-letters')
  @Permissions('billing.read')
  listDeadLetters(@Query('limit') limit?: string) {
    return this.queueService.listDeadLetters(limit ? Number(limit) : undefined);
  }

  @Post('queue/:requestId/requeue')
  @Permissions('billing.write')
  async requeue(@Param('requestId', ParseIntPipe) requestId: number) {
    const requeued = await this.queueService.requeueDeadLetter(requestId);
    return { requeued };
  }
}
