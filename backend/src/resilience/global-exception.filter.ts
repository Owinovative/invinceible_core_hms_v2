import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { TimeoutError } from 'rxjs';
import { SafeLoggerService } from './safe-logger.service';
import type { RequestWithContext } from './request-context.middleware';
import { safeRequestPath } from './safe-request-path';

type SafeErrorBody = {
  statusCode: number;
  message: string;
  error?: string;
  requestId?: string;
  timestamp: string;
  path?: string;
  details?: unknown;
};

function normalizeHttpResponse(response: string | object) {
  if (typeof response === 'string') {
    return { message: response };
  }

  return response as Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: SafeLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    const isProduction = nodeEnv === 'production';
    const requestId = request.requestId;
    const path = safeRequestPath(request.originalUrl || request.url);

    const statusCode = this.getStatusCode(exception);
    const errorResponse = this.getErrorResponse(exception, isProduction);

    const body: SafeErrorBody = {
      statusCode,
      message: errorResponse.message,
      error: errorResponse.error,
      requestId,
      timestamp: new Date().toISOString(),
      path,
      ...(isProduction ? {} : { details: errorResponse.details }),
    };

    this.logger.error(
      'Request failed',
      {
        requestId,
        method: request.method,
        path,
        statusCode,
        errorName:
          exception instanceof Error ? exception.name : typeof exception,
        errorMessage:
          exception instanceof Error ? exception.message : String(exception),
        bodyFields: this.fieldNames(request.body),
        queryFields: this.fieldNames(request.query),
      },
      isProduction || !(exception instanceof Error)
        ? undefined
        : exception.stack,
    );

    response.status(statusCode).json(body);
  }

  private fieldNames(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.keys(value as Record<string, unknown>).sort();
  }

  private getStatusCode(exception: unknown) {
    if (exception instanceof HttpException) return exception.getStatus();
    if (exception instanceof TimeoutError) return HttpStatus.REQUEST_TIMEOUT;
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return HttpStatus.CONFLICT;
      if (exception.code === 'P2025') return HttpStatus.NOT_FOUND;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorResponse(exception: unknown, isProduction: boolean) {
    if (exception instanceof HttpException) {
      const response = normalizeHttpResponse(exception.getResponse());
      const messageValue = response.message;
      const message = Array.isArray(messageValue)
        ? messageValue
            .filter((item): item is string => typeof item === 'string')
            .join('; ') || exception.message
        : typeof messageValue === 'string'
          ? messageValue
          : exception.message || 'Request failed';
      const error =
        typeof response.error === 'string'
          ? response.error
          : exception.name || 'HTTP_ERROR';

      return {
        message,
        error,
        details: response,
      };
    }

    if (exception instanceof TimeoutError) {
      return {
        message: 'The request took too long. Please retry shortly.',
        error: 'REQUEST_TIMEOUT',
        details: { name: exception.name, message: exception.message },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        message: isProduction
          ? 'Database request could not be completed safely.'
          : exception.message,
        error: `DATABASE_${exception.code}`,
        details: { code: exception.code, meta: exception.meta },
      };
    }

    return {
      message: isProduction
        ? 'Internal server error. Contact support with the request ID.'
        : exception instanceof Error
          ? exception.message
          : 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR',
      details:
        exception instanceof Error
          ? { name: exception.name, stack: exception.stack }
          : { value: String(exception) },
    };
  }
}
