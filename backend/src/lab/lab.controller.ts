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
import type { RequestUser } from '../auth/interfaces/request-user.interface';


@Controller('lab')
@UseGuards(AuthGuard('jwt'))
export class LabController {
  constructor(private readonly labService: LabService) {}


  @Post('tests')
  createTestCatalogItem(@Body() createLabTestDto: CreateLabTestDto) {
    return this.labService.createTestCatalogItem(createLabTestDto);
  }


  @Get('tests')
  getAllTests() {
    return this.labService.getAllTests();
  }


  @Post('orders')
  createOrder(@Body() createLabOrderDto: CreateLabOrderDto) {
    return this.labService.createOrder(createLabOrderDto);
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
  createResult(@Body() createLabResultDto: CreateLabResultDto) {
    return this.labService.createResult(createLabResultDto);
  }


  @Get('orders/:id/results')
  getResultsByOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.getResultsByOrderScoped(id, user);
  }
} 
