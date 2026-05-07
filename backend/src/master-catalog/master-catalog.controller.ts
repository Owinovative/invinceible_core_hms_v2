import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { PaginationQuery } from '../common/pagination/pagination';
import { ImportMasterCatalogCsvDto } from './dto/import-master-catalog-csv.dto';
import { MasterCatalogService } from './master-catalog.service';

@Controller('master-catalog')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
export class MasterCatalogController {
  constructor(private readonly masterCatalogService: MasterCatalogService) {}

  @Get('overview')
  getOverview() {
    return this.masterCatalogService.getOverview();
  }

  @Get('medicines')
  getMedicines(@Query() query: PaginationQuery) {
    return this.masterCatalogService.getMedicines(query);
  }

  @Get('medicines/template')
  getMedicinesTemplate() {
    return this.masterCatalogService.getMedicinesTemplate();
  }

  @Post('medicines/import')
  importMedicines(
    @Body() dto: ImportMasterCatalogCsvDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.masterCatalogService.importMedicines(dto, user);
  }

  @Get('billing-services')
  getBillingServices(@Query() query: PaginationQuery) {
    return this.masterCatalogService.getBillingServices(query);
  }

  @Get('billing-services/template')
  getBillingServicesTemplate() {
    return this.masterCatalogService.getBillingServicesTemplate();
  }

  @Post('billing-services/import')
  importBillingServices(
    @Body() dto: ImportMasterCatalogCsvDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.masterCatalogService.importBillingServices(dto, user);
  }

  @Get('lab-tests')
  getLabTests(@Query() query: PaginationQuery) {
    return this.masterCatalogService.getLabTests(query);
  }

  @Get('lab-tests/template')
  getLabTestsTemplate() {
    return this.masterCatalogService.getLabTestsTemplate();
  }

  @Post('lab-tests/import')
  importLabTests(
    @Body() dto: ImportMasterCatalogCsvDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.masterCatalogService.importLabTests(dto, user);
  }
}
