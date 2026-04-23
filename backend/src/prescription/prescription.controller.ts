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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';


@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'))
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}


  @Post()
  create(@Body() dto: CreatePrescriptionDto) {
    return this.prescriptionService.create(dto);
  }


  @Get()
  findAll(@CurrentUser() user: RequestUser) {
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionService.update(id, dto);
  }


  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionService.remove(id);
  }
}
