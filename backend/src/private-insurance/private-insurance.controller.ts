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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  CreateInsurancePayerDto,
  CreatePatientInsurancePolicyDto,
  CreatePrivateInsuranceClaimDto,
} from './dto/private-insurance.dto';
import { PrivateInsuranceService } from './private-insurance.service';

@Controller('private-insurance')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PrivateInsuranceController {
  constructor(private readonly insurance: PrivateInsuranceService) {}

  @Get('payers')
  @Permissions('billing.read')
  listPayers(@CurrentUser() user: RequestUser) {
    return this.insurance.listPayers(user);
  }

  @Post('payers')
  @Permissions('facility.manage')
  createPayer(
    @Body() dto: CreateInsurancePayerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.insurance.createPayer(dto, user);
  }

  @Get('policies')
  @Permissions('billing.read')
  listPolicies(@CurrentUser() user: RequestUser) {
    return this.insurance.listPolicies(user);
  }

  @Post('policies')
  @Permissions('billing.write')
  createPolicy(
    @Body() dto: CreatePatientInsurancePolicyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.insurance.createPolicy(dto, user);
  }

  @Post('policies/:id/verify')
  @Permissions('billing.write')
  verifyPolicy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.insurance.verifyPolicy(id, user);
  }

  @Get('claims')
  @Permissions('billing.read')
  listClaims(@CurrentUser() user: RequestUser) {
    return this.insurance.listClaims(user);
  }

  @Post('claims')
  @Permissions('billing.write')
  createClaim(
    @Body() dto: CreatePrivateInsuranceClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.insurance.createClaim(dto, user);
  }

  @Post('claims/:id/submit')
  @Permissions('billing.write')
  submitClaim(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.insurance.submitClaim(id, user);
  }
}
