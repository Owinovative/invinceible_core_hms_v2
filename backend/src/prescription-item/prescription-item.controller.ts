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
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrescriptionItemService } from './prescription-item.service';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';


@Controller('prescription-items')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PrescriptionItemController {
  constructor(private readonly prescriptionItemService: PrescriptionItemService) {}


  @Post()
  @Permissions('consultation.write')
  create(
    @Body() dto: CreatePrescriptionItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionItemService.create(dto, user);
  }


  @Get('prescription/:prescriptionId')
  findByPrescriptionId(
    @Param('prescriptionId', ParseIntPipe) prescriptionId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionItemService.findByPrescriptionIdScoped(
      prescriptionId,
      user,
    );
  }


  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionItemService.findOneScoped(id, user);
  }


  @Patch(':id')
  @Permissions('consultation.write')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionItemService.update(id, dto, user);
  }


  @Delete(':id')
  @Permissions('consultation.write')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionItemService.remove(id, user);
  }
}
