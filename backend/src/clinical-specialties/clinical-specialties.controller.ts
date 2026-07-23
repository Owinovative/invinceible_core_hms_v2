import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ClinicalSpecialtiesService } from './clinical-specialties.service';
import {
  AddDentalChartEntryDto,
  AddDentalProcedureDto,
  AddOrthopedicImplantDto,
  CreateDentalEncounterDto,
  CreateOrthopedicCaseDto,
  CreatePhysiotherapyReferralDto,
} from './dto/clinical-specialties.dto';

@Controller('clinical-specialties')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClinicalSpecialtiesController {
  constructor(private readonly specialties: ClinicalSpecialtiesService) {}

  @Get('dental/encounters')
  @Permissions('patient.read')
  listDental(@CurrentUser() user: RequestUser) {
    return this.specialties.listDental(user);
  }

  @Post('dental/encounters')
  @Permissions('consultation.write')
  createDental(
    @Body() dto: CreateDentalEncounterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.createDental(dto, user);
  }

  @Post('dental/encounters/:id/chart')
  @Permissions('consultation.write')
  addDentalChart(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDentalChartEntryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.addDentalChart(id, dto, user);
  }

  @Post('dental/encounters/:id/procedures')
  @Permissions('consultation.write')
  addDentalProcedure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDentalProcedureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.addDentalProcedure(id, dto, user);
  }

  @Get('orthopedic/cases')
  @Permissions('patient.read')
  listOrthopedic(@CurrentUser() user: RequestUser) {
    return this.specialties.listOrthopedic(user);
  }

  @Post('orthopedic/cases')
  @Permissions('consultation.write')
  createOrthopedic(
    @Body() dto: CreateOrthopedicCaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.createOrthopedic(dto, user);
  }

  @Post('orthopedic/cases/:id/implants')
  @Permissions('consultation.write')
  addImplant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrthopedicImplantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.addImplant(id, dto, user);
  }

  @Post('orthopedic/cases/:id/physiotherapy-referrals')
  @Permissions('consultation.write')
  referPhysiotherapy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePhysiotherapyReferralDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.specialties.referPhysiotherapy(id, dto, user);
  }
}
