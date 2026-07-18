import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeService } from '../../auth/scope.service';
import { SensitiveDataCipherService } from '../../common/security/sensitive-data-cipher.service';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';

interface ConsentGuardRequest {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user: RequestUser;
  consentToken?: string;
}

@Injectable()
export class RequireConsentGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly sensitiveData: SensitiveDataCipherService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ConsentGuardRequest>();

    // Extract patientId from body, query, or params
    const patientIdStr =
      request.body?.patientId ||
      request.params?.patientId ||
      request.query?.patientId;

    if (!patientIdStr) {
      // If no patientId is found in the request, we can't enforce consent here.
      // If the route strictly requires a patient, it should be validated by DTOs.
      return true;
    }

    const patientId = Number(patientIdStr);
    if (isNaN(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    // Check for an active consent authorization
    const activeConsent = await this.prisma.consentAuthorization.findFirst({
      where: {
        patientId,
        patient: {
          is: this.scope.buildFacilityScopeWhere(request.user),
        },
        status: 'AUTHORIZED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeConsent) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Active DHA Consent required for this action.',
        error: 'Consent Required',
        subCode: 'CONSENT_REQUIRED',
        patientId: patientId,
      });
    }

    // Optionally attach the consent token to the request for downstream use
    const storedToken =
      activeConsent.consentTokenCiphertext ?? activeConsent.consentToken;
    if (!storedToken) {
      throw new ForbiddenException('Consent credential is unavailable');
    }
    request.consentToken = this.sensitiveData.decrypt(storedToken);

    return true;
  }
}
