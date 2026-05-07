import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { StepUpDto } from './dto/step-up.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: any) {
    return this.authService.login(loginDto, {
      ipAddress:
        req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept-deactivation')
  acceptDeactivation(@Req() req: any) {
    return this.authService.acceptOwnDeactivation(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('step-up')
  createStepUpToken(@Body() dto: StepUpDto, @Req() req: any) {
    return this.authService.createStepUpToken(req.user, dto, {
      ipAddress:
        req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }
}
