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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type{ RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('pharmacy')
@UseGuards(AuthGuard('jwt'))
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('medicines')
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
  createPrescription(@Body() createPrescriptionDto: CreatePrescriptionDto) {
    return this.pharmacyService.createPrescription(createPrescriptionDto);
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
  getPharmacyQueue(@CurrentUser() user: RequestUser) {
    return this.pharmacyService.getPharmacyQueueScoped(user);
  }

  @Patch('prescriptions/:id/dispense')
  dispensePrescription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pharmacyService.dispensePrescription(id, user);
  }

}
