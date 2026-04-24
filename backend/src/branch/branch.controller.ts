import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { GrantUserBranchAccessDto } from './dto/grant-user-branch-access.dto';
import { SetUserHomeBranchDto } from './dto/set-user-home-branch.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('branches')
@UseGuards(AuthGuard('jwt'))
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Get()
  findAll() {
    return this.branchService.findAll();
  }

  @Get('facility/:facilityId')
  findByFacility(@Param('facilityId', ParseIntPipe) facilityId: number) {
    return this.branchService.findByFacility(facilityId);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.branchService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.remove(id);
  }

  @Post('access/grant')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  grantUserBranchAccess(@Body() dto: GrantUserBranchAccessDto) {
    return this.branchService.grantUserBranchAccess(dto);
  }

  @Get('access/user/:userId')
  getUserBranchAccesses(@Param('userId', ParseIntPipe) userId: number) {
    return this.branchService.getUserBranchAccesses(userId);
  }

  @Patch('access/user/home-branch')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
  setUserHomeBranch(@Body() dto: SetUserHomeBranchDto) {
    return this.branchService.setUserHomeBranch(dto);
  }
}
