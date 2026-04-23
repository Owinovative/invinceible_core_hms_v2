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
import { PrescriptionItemService } from './prescription-item.service';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';


@Controller('prescription-items')
@UseGuards(AuthGuard('jwt'))
export class PrescriptionItemController {
  constructor(private readonly prescriptionItemService: PrescriptionItemService) {}


  @Post()
  create(@Body() dto: CreatePrescriptionItemDto) {
    return this.prescriptionItemService.create(dto);
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionItemDto,
  ) {
    return this.prescriptionItemService.update(id, dto);
  }


  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionItemService.remove(id);
  }
}
