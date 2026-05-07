import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from '../user/user.module';
import { ScopeService } from './scope.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserLocationModule } from '../user-location/user-location.module';
import { PermissionsGuard } from './permissions.guard';
import { StepUpGuard } from './step-up.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UserModule,
    UserLocationModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            (configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ScopeService,
    PermissionsGuard,
    StepUpGuard,
  ],
  exports: [
    AuthService,
    ScopeService,
    PermissionsGuard,
    StepUpGuard,
    JwtModule,
  ],
})
export class AuthModule {}
