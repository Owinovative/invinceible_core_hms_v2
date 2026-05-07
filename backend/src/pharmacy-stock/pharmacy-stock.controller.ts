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



@Controller('pharmacy-stock')
@UseGuards(AuthGuard('jwt'))
export class PharmacyStockController {
  constructor(private readonly pharmacyStockService: PharmacyStockService) {}

  @Post()
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchMedicineStockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyStockService.updateScoped(id, dto, user);
  }

  @Patch(':id/add-stock/:quantity')
  addStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.pharmacyStockService.addStock(id, quantity);
  }
  @Patch(':stockId/restock')
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
  deductStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.pharmacyStockService.deductStock(id, quantity);
  }
}
