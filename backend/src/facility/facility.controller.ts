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
import { FacilityService } from './facility.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Controller('facilities')
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Post()
  create(@Body() dto: CreateFacilityDto) {
    return this.facilityService.create(dto);
  }

  @Get()
  findAll() {
    return this.facilityService.findAll();
  }

  @Get('default')
  findDefault() {
    return this.facilityService.findDefault();
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.facilityService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facilityService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilityService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facilityService.remove(id);
  }
}
