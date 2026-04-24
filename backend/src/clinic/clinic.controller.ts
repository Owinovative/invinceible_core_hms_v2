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
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('clinics')
@UseGuards(AuthGuard('jwt'))
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.clinicService.findAllScoped(user);
  }

  @Get('facility/:facilityId')
  findByFacility(@Param('facilityId', ParseIntPipe) facilityId: number) {
    return this.clinicService.findByFacility(facilityId);
  }

  @Get('branch/:branchId')
  findByBranch(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.clinicService.findByBranch(branchId);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.clinicService.findByCode(code);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.clinicService.findOneScoped(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClinicDto) {
    return this.clinicService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clinicService.remove(id);
  }
}
