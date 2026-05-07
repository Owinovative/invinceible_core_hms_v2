import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';


@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}


  @Post()
  @Permissions('consultation.write')
  create(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.create(dto, user);
  }


  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('consultationId') consultationId?: string,
    @Query('patientId') patientId?: string,
  ) {
    if (consultationId) {
      return this.prescriptionService.findByConsultationIdScoped(
        Number(consultationId),
        user,
      );
    }

    if (patientId) {
      return this.prescriptionService.findByPatientIdScoped(
        Number(patientId),
        user,
      );
    }

    return this.prescriptionService.findAllScoped(user);
  }


  @Get('consultation/:consultationId')
  findByConsultationId(
    @Param('consultationId', ParseIntPipe) consultationId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.findByConsultationIdScoped(
      consultationId,
      user,
    );
  }


  @Get('patient/:patientId')
  findByPatientId(
    @Param('patientId', ParseIntPipe) patientId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.findByPatientIdScoped(patientId, user);
  }


  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.findOneScoped(id, user);
  }


  @Patch(':id')
  @Permissions('consultation.write')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.update(id, dto, user);
  }


  @Delete(':id')
  @Permissions('consultation.write')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionService.remove(id, user);
  }
}
