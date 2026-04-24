import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const username = loginDto.username.trim();
    const password = loginDto.password.trim();
    const user = await this.userService.findAuthUserByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      if (user.lockedAt) {
        throw new UnauthorizedException(
          'Account locked after too many failed login attempts. Contact the super admin to reactivate it.',
        );
      }

      throw new UnauthorizedException('User account is inactive');
    }

    const isSuperAdmin = user.role?.code === 'SUPER_ADMIN';

    if (
      !isSuperAdmin &&
      user.homeFacilityId &&
      user.homeFacility &&
      user.homeFacility.isActive === false
    ) {
      throw new UnauthorizedException(
        'Your facility is inactive. Access is suspended.',
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          ...(shouldLock
            ? {
                isActive: false,
                lockedAt: new Date(),
                lockReason: `Locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts`,
              }
            : {}),
        },
      });

      if (shouldLock) {
        throw new UnauthorizedException(
          'Account locked after too many failed login attempts. Contact the super admin to reactivate it.',
        );
      }

      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      roleCode: user.role?.code,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedAt: null,
        lockReason: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      message: 'Login successful',
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number) {
    const user = await this.userService.findOne(userId);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      role: user.role,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findAuthUserByUsername(dto.username);

    if (!user || !user.isActive) {
      return {
        message:
          'If the account exists, a password reset link has been generated.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const response = {
      message:
        'If the account exists, a password reset link has been generated.',
    };

    if (this.shouldReturnDevResetToken()) {
      const resetBaseUrl =
        this.configService.get<string>('PASSWORD_RESET_BASE_URL') ??
        'http://localhost:3001/reset-password';

      return {
        ...response,
        devResetToken: rawToken,
        devResetLink: `${resetBaseUrl}?token=${rawToken}`,
        expiresAt,
      };
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
      },
      include: {
        user: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!resetRecord.user.isActive) {
      throw new BadRequestException('User account is inactive');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    const usedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      const claimedToken = await tx.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          usedAt: null,
        },
        data: { usedAt },
      });

      if (claimedToken.count !== 1) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetRecord.userId,
          usedAt: null,
        },
        data: { usedAt },
      });
    });

    return {
      message: 'Password reset successful',
    };
  }

  private shouldReturnDevResetToken() {
    return (
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('RETURN_DEV_RESET_TOKEN') === 'true'
    );
  }
}
