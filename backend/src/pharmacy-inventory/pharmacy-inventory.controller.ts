import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateMedicineReturnDto } from './dto/create-medicine-return.dto';
import { CreatePharmacyLocationDto } from './dto/create-pharmacy-location.dto';
import { ReceiveMedicineBatchDto } from './dto/receive-medicine-batch.dto';
import { ReviewMedicineReturnDto } from './dto/review-medicine-return.dto';
import { PharmacyInventoryService } from './pharmacy-inventory.service';

@Controller('pharmacy-inventory')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PharmacyInventoryController {
  constructor(private readonly inventory: PharmacyInventoryService) {}

  @Get('dashboard')
  @Permissions('reports.read')
  getDashboard(
    @CurrentUser() user: RequestUser,
    @Query('nearExpiryDays') nearExpiryDays?: string,
    @Query('deadStockDays') deadStockDays?: string,
  ) {
    return this.inventory.getDashboard(user, {
      nearExpiryDays: nearExpiryDays ? Number(nearExpiryDays) : undefined,
      deadStockDays: deadStockDays ? Number(deadStockDays) : undefined,
    });
  }

  @Get('locations')
  @Permissions('pharmacy.dispense')
  listLocations(@CurrentUser() user: RequestUser) {
    return this.inventory.listLocations(user);
  }

  @Get('batches')
  @Permissions('pharmacy.dispense')
  listBatches(@CurrentUser() user: RequestUser) {
    return this.inventory.listBatches(user);
  }

  @Get('movements')
  @Permissions('reports.read')
  listMovements(
    @CurrentUser() user: RequestUser,
    @Query('medicineId') medicineId?: string,
    @Query('pharmacyLocationId') pharmacyLocationId?: string,
    @Query('movementType') movementType?: string,
  ) {
    return this.inventory.listMovements(user, {
      medicineId: medicineId ? Number(medicineId) : undefined,
      pharmacyLocationId: pharmacyLocationId
        ? Number(pharmacyLocationId)
        : undefined,
      movementType,
    });
  }

  @Get('movements/export')
  @Permissions('reports.read')
  exportMovements(@CurrentUser() user: RequestUser) {
    return this.inventory.exportMovements(user);
  }

  @Post('locations')
  @Permissions('stock.adjust')
  createLocation(
    @Body() dto: CreatePharmacyLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.createLocation(dto, user);
  }

  @Post('batches/receive')
  @Permissions('stock.adjust')
  receiveBatch(
    @Body() dto: ReceiveMedicineBatchDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.receiveBatch(dto, user);
  }

  @Get('returns')
  @Permissions('pharmacy.dispense')
  listReturns(@CurrentUser() user: RequestUser) {
    return this.inventory.listReturns(user);
  }

  @Post('returns')
  @Permissions('pharmacy.dispense')
  createReturn(
    @Body() dto: CreateMedicineReturnDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.createReturn(dto, user);
  }

  @Post('returns/:id/review')
  @Permissions('stock.adjust')
  reviewReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewMedicineReturnDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventory.reviewReturn(id, dto, user);
  }
}
