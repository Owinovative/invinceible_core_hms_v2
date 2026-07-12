import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConsentService } from './consent.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  GetContactsDto,
  SendOtpDto,
  VerifyOtpDto,
  SendDischargeOtpDto,
} from './dto/consent.dto';

@Controller('consent')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('contacts/:patientId')
  @Permissions('consent.read', 'patient.read')
  async getContacts(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    return this.consentService.getContacts(patientId, req.user);
  }

  @Post('otp/request')
  @Permissions('consent.manage', 'consultation.write')
  async sendVisitOtp(@Body() dto: SendOtpDto, @Request() req: any) {
    return this.consentService.sendVisitOtp(dto, req.user);
  }

  @Post('otp/verify')
  @Permissions('consent.manage', 'consultation.write')
  async verifyVisitOtp(@Body() dto: VerifyOtpDto, @Request() req: any) {
    return this.consentService.verifyVisitOtp(dto, req.user);
  }

  @Post('otp/discharge')
  @Permissions('consent.manage', 'discharge.complete')
  async sendDischargeOtp(
    @Body() dto: SendDischargeOtpDto,
    @Request() req: any,
  ) {
    return this.consentService.sendDischargeOtp(dto, req.user);
  }

  @Get('status/:patientId')
  @Permissions('consent.read', 'patient.read')
  async getActiveConsent(@Param('patientId') patientId: string) {
    const consent = await this.consentService.getActiveConsent(
      parseInt(patientId, 10),
    );
    return { hasActiveConsent: !!consent, consent };
  }
}
