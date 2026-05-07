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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.secureCreate(createUserDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.userService.findAll(user);
  }

  @Get('username/:username')
  findByUsername(
    @Param('username') username: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.findByUsernameForActor(username, user);
  }

  @Get('email/:email')
  findByEmail(
    @Param('email') email: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.findByEmailForActor(email, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.findOneForActor(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.secureUpdate(id, updateUserDto, user);
  }

  @Patch(':id/reset-password')
  adminResetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.findOneForActor(id, user).then(() =>
      this.userService.adminResetPassword(id, dto),
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.userService.secureRemove(id, user);
  }
}
