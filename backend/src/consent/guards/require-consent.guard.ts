import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequireConsentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

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

    const patientId = parseInt(patientIdStr, 10);
    if (isNaN(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    // Check for an active consent authorization
    const activeConsent = await this.prisma.consentAuthorization.findFirst({
      where: {
        patientId,
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
    request.consentToken = activeConsent.consentToken;

    return true;
  }
}
