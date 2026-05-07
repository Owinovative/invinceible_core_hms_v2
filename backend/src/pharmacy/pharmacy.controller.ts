import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateDispenseDto } from './dto/create-dispense.dto';
import { DirectMedicineAdministrationDto } from './dto/direct-medicine-administration.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type{ RequestUser } from '../auth/interfaces/request-user.interface';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('pharmacy')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('medicines')
  @Permissions('stock.adjust')
  createMedicine(@Body() createMedicineDto: CreateMedicineDto) {
    return this.pharmacyService.createMedicine(createMedicineDto);
  }

  @Get('medicines')
  getAllMedicines() {
    return this.pharmacyService.getAllMedicines();
  }

  @Get('medicines/:id')
  getMedicineById(@Param('id', ParseIntPipe) id: number) {
    return this.pharmacyService.getMedicineById(id);
  }

  @Post('prescriptions')
  @Permissions('consultation.write')
  createPrescription(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyService.createPrescription(createPrescriptionDto, user);
  }

  @Get('prescriptions')
  getAllPrescriptions(@CurrentUser() user: RequestUser) {
    return this.pharmacyService.getAllPrescriptionsScoped(user);
  }

  @Get('prescriptions/:id')
  getPrescriptionById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyService.getPrescriptionByIdScoped(id, user);
  }

  @Get('queue')
  @Permissions('pharmacy.dispense')
  getPharmacyQueue(@CurrentUser() user: RequestUser) {
    return this.pharmacyService.getPharmacyQueueScoped(user);
  }

  @Patch('prescriptions/:id/dispense')
  @Permissions('pharmacy.dispense')
  dispensePrescription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto?: Partial<CreateDispenseDto>,
  ) {
    return this.pharmacyService.dispensePrescription(id, user, dto);
  }

  @Post('direct-administrations')
  @Permissions('consultation.write')
  directMedicineAdministration(
    @Body() dto: DirectMedicineAdministrationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyService.directMedicineAdministration(dto, user);
  }

}
