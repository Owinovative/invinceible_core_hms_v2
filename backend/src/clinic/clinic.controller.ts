import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Get()
  findAll() {
    return this.clinicService.findAll();
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clinicService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clinicService.remove(id);
  }
}
