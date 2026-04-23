import {
  Body,
  Controller,
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
import { TriageService } from './triage.service';
import { CreateTriageDto } from './dto/create-triage.dto';
import { UpdateTriageDto } from './dto/update-triage.dto';

@Controller('triage')
@UseGuards(AuthGuard('jwt'))
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post()
  create(
    @Body() dto: CreateTriageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.triageService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.triageService.findAllScoped(user);
  }

  @Get('waiting')
  findWaiting(@CurrentUser() user: RequestUser) {
    return this.triageService.findWaitingScoped(user);
  }
@Get('ready-for-doctor')
findReadyForDoctor(@CurrentUser() user: RequestUser) {
  return this.triageService.findReadyForDoctorScoped(user);
}
@Get('appointment/:appointmentId')
findByAppointmentId(
  @Param('appointmentId', ParseIntPipe) appointmentId: number,
  @CurrentUser() user: RequestUser,
) {
  return this.triageService.findByAppointmentIdScoped(appointmentId, user);
}

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.triageService.findOneScoped(id, user);
  }

  @Patch(':id/start')
  startTriage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.triageService.startTriage(id, user);
  }

  @Patch(':id/complete')
  completeTriage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTriageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.triageService.completeTriage(id, dto, user);
  }
}
