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
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'))
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentService.create(createAppointmentDto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.appointmentService.findAllScoped(user);
  }

  @Get('number/:appointmentNumber')
  findByAppointmentNumber(
    @Param('appointmentNumber') appointmentNumber: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentService.findByAppointmentNumberScoped(
      appointmentNumber,
      user,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentService.findOneScoped(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(id, updateAppointmentDto);
  }

  @Patch(':id/check-in')
  checkIn(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.checkIn(id);
  }

  @Patch(':id/start-consultation')
  startConsultation(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.startConsultation(id);
  }

  @Patch(':id/complete')
  completeAppointment(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.completeAppointment(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.remove(id);
  }
}
