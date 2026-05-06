import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { PatientPortalService } from './patient-portal.service';

@Controller('patient-portal')
@UseGuards(AuthGuard('jwt'))
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getProfile(user);
  }

  @Get('appointments')
  getAppointments(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getAppointments(user);
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getInvoices(user);
  }

  @Get('lab-results')
  getLabResults(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getLabResults(user);
  }

  @Get('prescriptions')
  getPrescriptions(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getPrescriptions(user);
  }
}
