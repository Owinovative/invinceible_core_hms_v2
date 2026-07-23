import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { LabService } from './lab.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  AmendLabResultDto,
  ValidateLabResultDto,
} from './dto/validate-lab-result.dto';
import {
  CreateExternalLabReferralDto,
  CreateExternalLabResultDto,
  CreateExternalLabPaymentDto,
  CreateExternalLabReportShareDto,
} from './dto/create-external-lab-referral.dto';

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

  @Get('external-referrals')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.enter')
  getExternalReferrals(@CurrentUser() user: RequestUser) {
    return this.labService.getExternalReferrals(user);
  }

  @Post('external-referrals')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.enter')
  createExternalReferral(
    @Body() dto: CreateExternalLabReferralDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createExternalReferral(dto, user);
  }

  @Post('external-referrals/items/:itemId/result')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.enter')
  createExternalResult(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateExternalLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createExternalResult(itemId, dto, user);
  }

  @Post('external-referrals/:id/payments')
  @UseGuards(PermissionsGuard)
  @Permissions('payment.collect')
  createExternalPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateExternalLabPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createExternalLabPayment(id, dto, user);
  }

  @Post('external-referrals/:id/report-shares')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  createExternalReportShare(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateExternalLabReportShareDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createExternalReportShare(id, dto, user);
  }

  @Post('external-results/:id/validate')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  validateExternalResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidateLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.validateExternalResult(id, dto, user);
  }

  @Post('external-results/:id/release')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  releaseExternalResult(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.releaseExternalResult(id, user);
  }

  @Post('results')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.enter')
  createResult(
    @Body() createLabResultDto: CreateLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.createResultScoped(createLabResultDto, user);
  }

  @Post('results/:id/validate')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  validateResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidateLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.validateResult(id, dto, user);
  }

  @Post('results/:id/release')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  releaseResult(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.releaseResult(id, user);
  }

  @Patch('results/:id/amend')
  @UseGuards(PermissionsGuard)
  @Permissions('lab.result.verify')
  amendResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AmendLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.amendResult(id, dto, user);
  }

  @Get('orders/:id/results')
  getResultsByOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labService.getResultsByOrderScoped(id, user);
  }
}

@Controller('lab-report-access')
export class ExternalLabReportAccessController {
  constructor(private readonly labService: LabService) {}

  @Get(':token/pdf')
  async getReportPdf(@Param('token') token: string, @Res() response: Response) {
    const pdf = await this.labService.getExternalReportPdf(token);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="external-lab-report.pdf"',
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(pdf);
  }
}
