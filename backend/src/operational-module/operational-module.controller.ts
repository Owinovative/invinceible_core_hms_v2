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
import { OperationalModuleService } from './operational-module.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateOperationalModuleRecordDto } from './dto/create-operational-module-record.dto';
import { UpdateOperationalModuleRecordDto } from './dto/update-operational-module-record.dto';
import { OperationalModuleFilterDto } from './dto/operational-module-filter.dto';

@Controller('operational-modules')
@UseGuards(AuthGuard('jwt'))
export class OperationalModuleController {
  constructor(
    private readonly operationalModuleService: OperationalModuleService,
  ) {}

  @Get('summary')
  getGlobalSummary(
    @Query() filter: OperationalModuleFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationalModuleService.getGlobalSummary(filter, user);
  }

  @Get(':moduleSlug/records')
  findModuleRecords(
    @Param('moduleSlug') moduleSlug: string,
    @Query() filter: OperationalModuleFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationalModuleService.findModuleRecords(
      moduleSlug,
      filter,
      user,
    );
  }

  @Post(':moduleSlug/records')
  create(
    @Param('moduleSlug') moduleSlug: string,
    @Body() dto: CreateOperationalModuleRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationalModuleService.create(moduleSlug, dto, user);
  }

  @Get(':moduleSlug/records/:id')
  findOne(
    @Param('moduleSlug') moduleSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationalModuleService.findOne(moduleSlug, id, user);
  }

  @Patch(':moduleSlug/records/:id')
  update(
    @Param('moduleSlug') moduleSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperationalModuleRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.operationalModuleService.update(moduleSlug, id, dto, user);
  }
}
