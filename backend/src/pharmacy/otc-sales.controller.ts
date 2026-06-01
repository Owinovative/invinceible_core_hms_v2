import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { OtcSalesService } from './otc-sales.service';
import {
  CreateOtcSaleDto,
  OtcSaleItemInputDto,
} from './dto/create-otc-sale.dto';
import { UpdateOtcSaleItemDto } from './dto/update-otc-sale-item.dto';
import { RecordOtcSalePaymentDto } from './dto/record-otc-sale-payment.dto';
import {
  OtcMedicineSearchQueryDto,
  OtcSaleListQueryDto,
} from './dto/otc-sale-query.dto';

@Controller('pharmacy/otc')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('otc.sale')
export class OtcSalesController {
  constructor(private readonly otcSalesService: OtcSalesService) {}

  @Get('medicines/search')
  searchMedicines(
    @Query() query: OtcMedicineSearchQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.searchMedicines(query, user);
  }

  @Post('sales')
  createSale(
    @Body() dto: CreateOtcSaleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.createSale(dto, user);
  }

  @Get('sales')
  listSales(
    @Query() query: OtcSaleListQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.listSales(query, user);
  }

  @Get('sales/:id')
  getSale(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.getSale(id, user);
  }

  @Post('sales/:id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OtcSaleItemInputDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.addItem(id, dto, user);
  }

  @Patch('sales/:id/items/:itemId')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOtcSaleItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.updateItem(id, itemId, dto, user);
  }

  @Delete('sales/:id/items/:itemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.removeItem(id, itemId, user);
  }

  @Post('sales/:id/pay')
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordOtcSalePaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.recordPayment(id, dto, user);
  }

  @Post('sales/:id/complete')
  completeSale(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.completeSale(id, user);
  }

  @Get('sales/:id/receipt.pdf')
  async downloadReceiptPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
  ) {
    const receipt = await this.otcSalesService.getReceiptPdf(id, user);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${receipt.fileName}"`,
      'Cache-Control': 'private, no-store',
    });
    response.end(receipt.buffer);
  }

  @Post('sales/:id/cancel')
  cancelSale(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.otcSalesService.cancelSale(id, user);
  }
}
