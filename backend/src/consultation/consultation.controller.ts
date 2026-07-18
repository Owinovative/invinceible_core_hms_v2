import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsultationService } from './consultation.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('consultations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post()
  @Permissions('consultation.write')
  create(
    @Body() createConsultationDto: CreateConsultationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.create(createConsultationDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.consultationService.findAllScoped(user);
  }

  @Get(':id/workspace')
  getWorkspace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.getWorkspaceScoped(id, user);
  }

  @Get('number/:consultationNumber')
  findByConsultationNumber(
    @Param('consultationNumber') consultationNumber: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.findByConsultationNumberScoped(
      consultationNumber,
      user,
    );
  }

  @Get('appointment/:appointmentId')
  findByAppointmentId(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.findByAppointmentIdScoped(
      appointmentId,
      user,
    );
  }
  @Get('patient/:patientId')
  findByPatientId(
    @Param('patientId', ParseIntPipe) patientId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.findByPatientIdScoped(patientId, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consultationService.findOneScoped(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsultationDto: UpdateConsultationDto,
  ) {
    return this.consultationService.update(id, updateConsultationDto);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.consultationService.complete(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.consultationService.remove(id);
  }
}
