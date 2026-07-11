import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateOrUpdateLegalDocumentDto, AcceptLegalDocumentDto } from './dto/legal.dto';
import { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getPublishedDocuments() {
    // Get the most recent PUBLISHED document of each type
    const types = ['TERMS', 'PRIVACY', 'COOKIES'];
    const documents = await Promise.all(
      types.map((type) =>
        this.prisma.legalDocument.findFirst({
          where: { type, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        })
      )
    );

    return documents.filter(Boolean);
  }

  async acceptDocument(dto: AcceptLegalDocumentDto, user: RequestUser, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type: dto.type,
          version: dto.version,
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Legal document ${dto.type} v${dto.version} not found`);
    }

    if (document.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot accept an unpublished document');
    }

    // Check if already accepted
    const existing = await this.prisma.legalAcceptance.findUnique({
      where: {
        userId_documentId: {
          userId: user.userId,
          documentId: document.id,
        },
      },
    });

    if (existing) {
      return existing; // Already accepted
    }

    const acceptance = await this.prisma.legalAcceptance.create({
      data: {
        userId: user.userId,
        documentId: document.id,
        ipAddress,
        userAgent,
      },
    });

    await this.auditLogService.create({
      moduleName: 'LEGAL',
      actionName: 'USER_ACCEPTED_LEGAL_TERMS',
      entityType: 'LEGAL_DOCUMENT',
      entityId: String(document.id),
      description: `User accepted ${dto.type} version ${dto.version}`,
      actorUserId: user.userId,
      ipAddress,
      userAgent,
      afterData: JSON.stringify(acceptance),
    });

    return acceptance;
  }

  // Admin APIs

  async getAllDocuments() {
    return this.prisma.legalDocument.findMany({
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async saveDraft(dto: CreateOrUpdateLegalDocumentDto, user: RequestUser) {
    const existing = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type: dto.type,
          version: dto.version,
        },
      },
    });

    if (existing) {
      if (existing.status === 'PUBLISHED') {
        throw new BadRequestException('Cannot edit a published document. Create a new version instead.');
      }
      return this.prisma.legalDocument.update({
        where: { id: existing.id },
        data: {
          title: dto.title,
          content: dto.content,
        },
      });
    }

    return this.prisma.legalDocument.create({
      data: {
        type: dto.type,
        version: dto.version,
        title: dto.title,
        content: dto.content,
        status: 'DRAFT',
      },
    });
  }

  async publishDocument(id: number, user: RequestUser) {
    const document = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    
    if (document.status === 'PUBLISHED') {
      return document;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Archive other published versions of this type
      await tx.legalDocument.updateMany({
        where: {
          type: document.type,
          status: 'PUBLISHED',
          id: { not: id },
        },
        data: { status: 'ARCHIVED' },
      });

      // Publish this one
      return tx.legalDocument.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    });

    await this.auditLogService.create({
      moduleName: 'LEGAL',
      actionName: 'PUBLISH_LEGAL_DOCUMENT',
      entityType: 'LEGAL_DOCUMENT',
      entityId: String(document.id),
      description: `Published ${document.type} version ${document.version}`,
      actorUserId: user.userId,
    });

    return updated;
  }
}
