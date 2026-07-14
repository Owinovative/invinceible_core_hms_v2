import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import type { RequestWithContext } from '../../resilience/request-context.middleware';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { DhaService } from './dha.service';
import {
  CheckEligibilityDto,
  RecordConsentDto,
  QueueEclaimsCommandDto,
  SubmitReferralDto,
  VerifyFacilityDto,
  VerifyPatientDto,
  VerifyPractitionerDto,
} from './dto/dha-requests.dto';

@Controller('integrations/dha')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DhaController {
  constructor(
    private readonly dhaService: DhaService,
    private readonly queueService: IntegrationQueueService,
    private readonly config: IntegrationConfigService,
  ) {}

  private options(user: RequestUser, req: RequestWithContext) {
    return {
      correlationId: req.requestId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      facilityId: user.homeFacilityId ?? undefined,
    };
  }

  @Get('status')
  @Permissions('billing.read')
  async getStatus() {
    return {
      enabled: this.config.dhaEnabled,
      mode: this.config.dhaMode,
      apiVersion: this.config.dhaApiVersion,
      queue: await this.queueService.getStats('DHA'),
    };
  }

  @Post('patients/verify')
  @Permissions('patient.read')
  verifyPatient(
    @Body() dto: VerifyPatientDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.verifyPatient(dto, this.options(user, req));
  }

  @Post('practitioners/verify')
  @Permissions('users.manage')
  verifyPractitioner(
    @Body() dto: VerifyPractitionerDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.verifyPractitioner(dto, this.options(user, req));
  }

  @Post('facilities/verify')
  @Permissions('billing.read')
  verifyFacility(
    @Body() dto: VerifyFacilityDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.verifyFacility(dto, this.options(user, req));
  }

  @Post('eligibility')
  @Permissions('billing.read')
  checkEligibility(
    @Body() dto: CheckEligibilityDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.checkEligibility(dto, this.options(user, req));
  }

  @Post('consent')
  @Permissions('patient.write')
  recordConsent(
    @Body() dto: RecordConsentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.recordConsent(dto, this.options(user, req));
  }

  @Post('referrals')
  @Permissions('consultation.write')
  submitReferral(
    @Body() dto: SubmitReferralDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.submitReferral(dto, this.options(user, req));
  }

  @Post('encounters/consultation/:consultationId')
  @Permissions('consultation.write')
  submitEncounter(
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.submitEncounterForConsultation(
      consultationId,
      this.options(user, req),
    );
  }

  @Post('eclaims/:operation')
  @Permissions('billing.write')
  queueEclaimsCommand(
    @Param('operation') operation: string,
    @Body() dto: QueueEclaimsCommandDto,
    @CurrentUser() user: RequestUser,
    @Req() req: RequestWithContext,
  ) {
    return this.dhaService.queueEclaimsOperation(
      {
        operation: operation as import('./eclaims-contract').DhaEclaimsOperation,
        payload: dto.payload,
      },
      dto.idempotencyKey,
      {
        ...this.options(user, req),
        patientId: dto.patientId,
      },
    );
  }

  @Get('transactions')
  @Permissions('billing.read')
  listTransactions(
    @CurrentUser() user: RequestUser,
    @Query('patientId') patientId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dhaService.listTransactions({
      facilityId: user.homeFacilityId ?? undefined,
      patientId: patientId ? Number(patientId) : undefined,
      transactionType: transactionType || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Poll DHA for the current status of a specific SHA claim. */
  @Get('claims/:claimId/status')
  @Permissions('billing.read')
  pollClaimStatus(@Param('claimId', ParseIntPipe) claimId: number) {
    return this.dhaService.pollClaimStatus(claimId);
  }

  /**
   * DHA push webhook — called by AfyaLink when a claim decision is made.
   * Immediately updates the local ShaClaim record so the next UI poll
   * reflects the new status without waiting for the scheduled poller.
   */
  @Post('callbacks/claim-status')
  async claimStatusWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    payload: {
      request?: { reference?: string };
      id?: string;
      status?: string;
      outcome?: string;
      claimNumber?: string;
    },
  ) {
    if (!this.webhookSecretMatches(authorization)) {
      throw new UnauthorizedException('Invalid DHA callback authorization');
    }
    const claimNumber =
      payload?.claimNumber ||
      payload?.request?.reference?.split('/')?.[1] ||
      payload?.id;
    const status = payload?.status || payload?.outcome;

    if (!claimNumber || !status) {
      throw new BadRequestException('Callback requires claim number and status');
    }
    await this.dhaService.handleClaimStatusCallback({ claimNumber, status });
    return { received: true };
  }

  private webhookSecretMatches(authorization?: string): boolean {
    const expected = process.env.DHA_WEBHOOK_SECRET;
    const actual = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!expected) return false;
    const actualBytes = Buffer.from(actual);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  }
}
