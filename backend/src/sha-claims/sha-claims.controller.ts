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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateShaClaimDto } from './dto/create-sha-claim.dto';
import { UpdateShaClaimDto } from './dto/update-sha-claim.dto';
import { ShaClaimsService } from './sha-claims.service';

@Controller('sha-claims')
@UseGuards(AuthGuard('jwt'))
export class ShaClaimsController {
  constructor(private readonly shaClaimsService: ShaClaimsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.shaClaimsService.findAll(user);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.shaClaimsService.getSummary(user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  create(@Body() dto: CreateShaClaimDto, @CurrentUser() user: RequestUser) {
    return this.shaClaimsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShaClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.shaClaimsService.update(id, dto, user);
  }
}
