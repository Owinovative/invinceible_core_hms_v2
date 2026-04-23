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
import { IpdService } from './ipd.service';
import { CreateWardDto } from './dto/create-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UpdateWardDto } from './dto/update-ward.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';
import { TransferAdmissionBedDto } from './dto/transfer-admission-bed.dto';

@Controller('ipd')
@UseGuards(AuthGuard('jwt'))
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Post('wards')
  createWard(@Body() createWardDto: CreateWardDto) {
    return this.ipdService.createWard(createWardDto);
  }

  @Get('wards')
  getAllWards() {
    return this.ipdService.getAllWards();
  }

  @Post('beds')
  createBed(@Body() createBedDto: CreateBedDto) {
    return this.ipdService.createBed(createBedDto);
  }

  @Get('beds')
  getAllBeds() {
    return this.ipdService.getAllBeds();
  }

  @Post('admissions')
  createAdmission(@Body() createAdmissionDto: CreateAdmissionDto) {
    return this.ipdService.createAdmission(createAdmissionDto);
  }

  @Get('admissions')
  getAllAdmissions(@CurrentUser() user: RequestUser) {
    return this.ipdService.getAllAdmissionsScoped(user);
  }

  @Get('admissions/active')
  getActiveAdmissions(@CurrentUser() user: RequestUser) {
    return this.ipdService.getActiveAdmissionsScoped(user);
  }

  @Get('admissions/:id')
  getAdmissionById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.getAdmissionByIdScoped(id, user);
  }
  @Patch('wards/:id')
updateWard(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateWardDto: UpdateWardDto,
) {
  return this.ipdService.updateWard(id, updateWardDto);
}

@Patch('beds/:id')
updateBed(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateBedDto: UpdateBedDto,
) {
  return this.ipdService.updateBed(id, updateBedDto);
}

@Patch('beds/:id/status')
updateBedStatus(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateBedStatusDto: UpdateBedStatusDto,
) {
  return this.ipdService.updateBedStatus(id, updateBedStatusDto.statusCode);
}
  @Patch('admissions/:id/transfer-bed')
transferAdmissionBed(
  @Param('id', ParseIntPipe) id: number,
  @Body() transferAdmissionBedDto: TransferAdmissionBedDto,
) {
  return this.ipdService.transferAdmissionBed(id, transferAdmissionBedDto);
}

  @Patch('admissions/:id/discharge')
  dischargeAdmission(@Param('id', ParseIntPipe) id: number) {
    return this.ipdService.dischargeAdmission(id);
  }
}
