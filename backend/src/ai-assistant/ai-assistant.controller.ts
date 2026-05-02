import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AiAssistantService } from './ai-assistant.service';
import {
  ClinicalAiRequestDto,
  IdentityOcrRequestDto,
} from './dto/clinical-ai-request.dto';

@Controller('ai-assistant')
@UseGuards(AuthGuard('jwt'))
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Get('status')
  getStatus() {
    return this.aiAssistantService.getStatus();
  }

  @Post('clinical-draft')
  createClinicalDraft(
    @Body() dto: ClinicalAiRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.aiAssistantService.createClinicalDraft(dto, user);
  }

  @Post('identity-ocr')
  extractIdentity(
    @Body() dto: IdentityOcrRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.aiAssistantService.extractIdentity(dto, user);
  }
}
