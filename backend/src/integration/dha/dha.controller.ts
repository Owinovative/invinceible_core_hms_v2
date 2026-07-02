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
import { DhaService } from './dha.service';
import {
  CheckEligibilityDto,
  RecordConsentDto,
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
      queue: await this.queueService.getStats(),
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
}
