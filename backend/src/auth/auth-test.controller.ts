import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth-test')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthTestController {
  @Get('admin-only')
  @Roles('SUPER_ADMIN', 'ADMIN')
  adminOnly() {
    return {
      message: 'Welcome admin, this route is protected by RBAC',
    };
  }

  @Get('doctor-only')
  @Roles('DOCTOR')
  doctorOnly() {
    return {
      message: 'Welcome doctor, this route is protected by RBAC',
    };
  }

  @Get('lab-only')
  @Roles('LAB_TECH')
  labOnly() {
    return {
      message: 'Welcome lab technician, this route is protected by RBAC',
    };
  }
}
