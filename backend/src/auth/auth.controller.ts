import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { StepUpDto } from './dto/step-up.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto, {
      ipAddress:
        req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    response.cookie(
      AUTH_COOKIE_NAME,
      result.accessToken,
      getAuthCookieOptions(this.configService),
    );
    return {
      message: result.message,
      user: result.user,
      requiresLegalConsent: result.requiresLegalConsent,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(req.user);
    const clearOptions = getAuthCookieOptions(this.configService);
    delete clearOptions.maxAge;
    response.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    return { message: 'Logout successful' };
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
