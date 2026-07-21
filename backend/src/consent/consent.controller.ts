import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  SendOtpDto,
  VerifyOtpDto,
  SendDischargeOtpDto,
} from './dto/consent.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('consent')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('contacts/:patientId')
  @Permissions('consent.read', 'patient.read')
  async getContacts(
    @Param('patientId') patientId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consentService.getContacts(patientId, user);
  }

  @Post('otp/request')
  @Permissions('consent.manage', 'consultation.write')
  async sendVisitOtp(
    @Body() dto: SendOtpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consentService.sendVisitOtp(dto, user);
  }

  @Post('otp/verify')
  @Permissions('consent.manage', 'consultation.write')
  async verifyVisitOtp(
    @Body() dto: VerifyOtpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consentService.verifyVisitOtp(dto, user);
  }

  @Post('otp/discharge')
  @Permissions('consent.manage', 'discharge.complete')
  async sendDischargeOtp(
    @Body() dto: SendDischargeOtpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consentService.sendDischargeOtp(dto, user);
  }

  @Get('status/:patientId')
  @Permissions('consent.read', 'patient.read')
  async getActiveConsent(
    @Param('patientId') patientId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const consent = await this.consentService.getActiveConsent(
      parseInt(patientId, 10),
      user,
    );
    return { hasActiveConsent: !!consent, consent };
  }
}
