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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PossibleDuplicatePatientDto } from './dto/possible-duplicate-patient.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('patients')
@UseGuards(AuthGuard('jwt'))
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.createScoped(createPatientDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() query: any) {
    if (query?.page || query?.pageSize || query?.search) {
      return this.patientService.findPageScoped(user, query);
    }

    return this.patientService.findAllScoped(user);
  }

  @Get('search/suggestions')
  searchSuggestions(
    @CurrentUser() user: RequestUser,
    @Query('search') search = '',
  ) {
    return this.patientService.searchSuggestionsScoped(user, search);
  }

  @Post('duplicate-check')
  duplicateCheck(
    @Body() dto: PossibleDuplicatePatientDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.findPossibleDuplicatesScoped(user, dto);
  }

  @Get('number/:patientNumber')
  findByPatientNumber(
    @Param('patientNumber') patientNumber: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.findByPatientNumberScoped(patientNumber, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.findOneScoped(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.updateScoped(id, updatePatientDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.removeScoped(id, user);
  }
}
