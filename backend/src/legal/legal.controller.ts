import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { LegalService } from './legal.service';
import {
  CreateOrUpdateLegalDocumentDto,
  AcceptLegalDocumentDto,
} from './dto/legal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // Public endpoint for fetching current published documents (used by login screen / footers)
  @Get('documents/published')
  getPublishedDocuments() {
    return this.legalService.getPublishedDocuments();
  }

  // Protected endpoint for a logged-in user to accept a document
  @UseGuards(JwtAuthGuard)
  @Post('accept')
  acceptDocument(
    @Body() dto: AcceptLegalDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Ip() ipAddress: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.legalService.acceptDocument(
      dto,
      req.user,
      ipAddress,
      userAgent,
    );
  }

  // Admin APIs

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('legal.manage')
  @Get('admin/documents')
  getAllDocuments() {
    return this.legalService.getAllDocuments();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('legal.manage')
  @Post('admin/documents')
  saveDraft(
    @Body() dto: CreateOrUpdateLegalDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.legalService.saveDraft(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('legal.manage')
  @Post('admin/documents/:id/publish')
  publishDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.legalService.publishDocument(id, req.user);
  }
}
