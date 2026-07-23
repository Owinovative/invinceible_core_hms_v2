import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PharmacyStockService } from './pharmacy-stock.service';
import { CreateBranchMedicineStockDto } from './dto/create-branch-medicine-stock.dto';
import { UpdateBranchMedicineStockDto } from './dto/update-branch-medicine-stock.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RestockBranchMedicineDto } from './dto/restock-branch-medicine.dto';
import { ImportBranchPricingCsvDto } from './dto/import-branch-pricing-csv.dto';
import type { PaginationQuery } from '../common/pagination/pagination';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('pharmacy-stock')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PharmacyStockController {
  constructor(private readonly pharmacyStockService: PharmacyStockService) {}

  @Post()
  @Permissions('stock.adjust')
  create(
    @Body() dto: CreateBranchMedicineStockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.createScoped(dto, user);
  }

  @Get()
  findAll(@Query() query: PaginationQuery, @CurrentUser() user: RequestUser) {
    return this.pharmacyStockService.findAllScoped(user, query);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: RequestUser) {
    return this.pharmacyStockService.getLowStockScoped(user);
  }

  @Get('branch/:branchId/pricing-template')
  getBranchPricingTemplate(
    @Param('branchId', ParseIntPipe) branchId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.getBranchPricingTemplate(branchId, user);
  }

  @Post('branch/:branchId/pricing-import')
  @Permissions('stock.adjust')
  importBranchPricing(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: ImportBranchPricingCsvDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.importBranchPricing(branchId, dto, user);
  }

  @Get('branch/:branchId/search')
  searchBranchMedicines(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('search') search: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.searchBranchMedicinesScoped(
      branchId,
      search,
      user,
    );
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query() query: PaginationQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.findByBranchScoped(branchId, user, query);
  }

  @Get('branch/:branchId/medicine/:medicineId/alternatives')
  findMedicineAlternatives(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.findMedicineAlternativesScoped(
      branchId,
      medicineId,
      user,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.findOneScoped(id, user);
  }

  @Patch(':id')
  @Permissions('stock.adjust')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchMedicineStockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.updateScoped(id, dto, user);
  }

  @Patch(':id/add-stock/:quantity')
  @Permissions('stock.adjust')
  addStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('quantity', ParseIntPipe) quantity: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.addStockScoped(id, quantity, user);
  }
  @Patch(':stockId/restock')
  @Permissions('stock.adjust')
  restockBranchMedicine(
    @Param('stockId', ParseIntPipe) stockId: number,
    @Body() dto: RestockBranchMedicineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.restockBranchMedicineScoped(
      stockId,
      dto,
      user,
    );
  }

  @Patch(':id/deduct-stock/:quantity')
  @Permissions('stock.adjust')
  deductStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('quantity', ParseIntPipe) quantity: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.deductStockScoped(id, quantity, user);
  }
}
