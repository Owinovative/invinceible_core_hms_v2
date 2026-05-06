import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
}

function parseOriginList(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

function buildAllowedOrigins(configService: ConfigService) {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const origins = [
    ...parseOriginList(configService.get<string>('FRONTEND_URL')),
    ...parseOriginList(configService.get<string>('FRONTEND_ORIGINS')),
  ];

  if (nodeEnv !== 'production') {
    origins.push('http://localhost:3000', 'http://localhost:3001');
  }

  return Array.from(new Set(origins));
}

function getPort(configService: ConfigService) {
  const port = Number(configService.get<string>('PORT') ?? 3000);
  return Number.isInteger(port) && port > 0 ? port : 3000;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const allowedOrigins = buildAllowedOrigins(configService);
  const trustProxy =
    String(configService.get<string>('TRUST_PROXY') || '').toLowerCase() ===
    'true';

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.enableShutdownHooks();
  app.use(json({ limit: configService.get<string>('BODY_LIMIT') || '4mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: configService.get<string>('BODY_LIMIT') || '4mb',
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.includes(normalizeOrigin(origin));

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin is not allowed'), false);
    },
    credentials: true,
  });

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    if (configService.get<string>('NODE_ENV') === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    }),
  );

  await app.listen(getPort(configService));
}

bootstrap();
