import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LabService } from './lab.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('lab')
@UseGuards(AuthGuard('jwt'))
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('tests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  createTestCatalogItem(@Body() createLabTestDto: CreateLabTestDto) {
    return this.labService.createTestCatalogItem(createLabTestDto);
  }

  @Get('tests')
  getAllTests() {
    return this.labService.getAllTests();
  }

  @Post('orders')
  createOrder(
    @Body() createLabOrderDto: CreateLabOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createOrderScoped(createLabOrderDto, user);
  }

  @Get('orders')
  getAllOrders(@CurrentUser() user: RequestUser) {
    return this.labService.getAllOrdersScoped(user);
  }

  @Get('orders/:id')
  getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.getOrderByIdScoped(id, user);
  }

  @Get('queue')
  getLabQueue(@CurrentUser() user: RequestUser) {
    return this.labService.getLabQueueScoped(user);
  }

  @Post('results')
  createResult(
    @Body() createLabResultDto: CreateLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createResultScoped(createLabResultDto, user);
  }

  @Get('orders/:id/results')
  getResultsByOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.getResultsByOrderScoped(id, user);
  }
}
