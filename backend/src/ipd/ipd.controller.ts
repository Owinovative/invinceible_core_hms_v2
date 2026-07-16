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
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('ipd')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Post('wards')
  @Permissions('admission.manage')
  createWard(
    @Body() createWardDto: CreateWardDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.createWardScoped(createWardDto, user);
  }

  @Get('wards')
  @Permissions('patient.read')
  getAllWards(@CurrentUser() user: RequestUser) {
    return this.ipdService.getAllWardsScoped(user);
  }

  @Post('beds')
  @Permissions('admission.manage')
  createBed(
    @Body() createBedDto: CreateBedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.createBedScoped(createBedDto, user);
  }

  @Get('beds')
  @Permissions('patient.read')
  getAllBeds(@CurrentUser() user: RequestUser) {
    return this.ipdService.getAllBedsScoped(user);
  }

  @Post('admissions')
  @Permissions('admission.manage')
  createAdmission(
    @Body() createAdmissionDto: CreateAdmissionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.createAdmissionScoped(createAdmissionDto, user);
  }

  @Get('admissions')
  @Permissions('patient.read')
  getAllAdmissions(@CurrentUser() user: RequestUser) {
    return this.ipdService.getAllAdmissionsScoped(user);
  }

  @Get('admissions/active')
  @Permissions('patient.read')
  getActiveAdmissions(@CurrentUser() user: RequestUser) {
    return this.ipdService.getActiveAdmissionsScoped(user);
  }

  @Get('admissions/:id')
  @Permissions('patient.read')
  getAdmissionById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.getAdmissionByIdScoped(id, user);
  }
  @Patch('wards/:id')
  @Permissions('admission.manage')
  updateWard(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWardDto: UpdateWardDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.updateWardScoped(id, updateWardDto, user);
  }

  @Patch('beds/:id')
  @Permissions('admission.manage')
  updateBed(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBedDto: UpdateBedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.updateBedScoped(id, updateBedDto, user);
  }

  @Patch('beds/:id/status')
  @Permissions('admission.manage')
  updateBedStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBedStatusDto: UpdateBedStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.updateBedStatusScoped(
      id,
      updateBedStatusDto.statusCode,
      user,
    );
  }
  @Patch('admissions/:id/transfer-bed')
  @Permissions('admission.manage')
  transferAdmissionBed(
    @Param('id', ParseIntPipe) id: number,
    @Body() transferAdmissionBedDto: TransferAdmissionBedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.transferAdmissionBedScoped(
      id,
      transferAdmissionBedDto,
      user,
    );
  }

  @Patch('admissions/:id/discharge')
  @Permissions('discharge.complete')
  dischargeAdmission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ipdService.dischargeAdmissionScoped(id, user);
  }
}
