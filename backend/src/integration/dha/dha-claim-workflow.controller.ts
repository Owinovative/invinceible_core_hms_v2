import { BadRequestException, Body, Controller, Param, ParseIntPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { CreateDhaClaimWorkflowDto, DhaWorkflowActionDto, StageDhaWorkflowAttachmentDto } from './dto/dha-claim-workflow.dto';
import { DhaClaimWorkflowService } from './dha-claim-workflow.service';

@Controller('integrations/dha/claim-workflows')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DhaClaimWorkflowController {
  constructor(private readonly workflows: DhaClaimWorkflowService) {}

  @Post()
  @Permissions('billing.write')
  create(@Body() dto: CreateDhaClaimWorkflowDto, @CurrentUser() user: RequestUser) {
    return this.workflows.create({ ...dto, actorUserId: user.userId });
  }

  @Post(':id/recover')
  @Permissions('billing.write')
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.workflows.recover(id);
  }

  @Post(':id/emergency')
  @Permissions('billing.write')
  emergency(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DhaWorkflowActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflows.queueAction(
      id,
      'EMERGENCY',
      dto.payload,
      dto.idempotencyKey,
      user.userId,
    );
  }

  @Post(':id/preauthorizations')
  @Permissions('billing.write')
  preauthorize(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DhaWorkflowActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflows.queueMultipartAction(
      id,
      'PREAUTH_SUBMIT',
      dto.payload,
      dto.idempotencyKey,
      user.userId,
    );
  }

  @Post(':id/emt')
  @Permissions('billing.write')
  submitEmt(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DhaWorkflowActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflows.queueMultipartAction(
      id,
      'EMT_SUBMIT',
      dto.payload,
      dto.idempotencyKey,
      user.userId,
    );
  }

  @Post(':id/otp-whitelist')
  @Permissions('billing.write')
  submitOtpWhitelist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DhaWorkflowActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflows.queueMultipartAction(
      id,
      'OTP_WHITELIST_SUBMIT',
      dto.payload,
      dto.idempotencyKey,
      user.userId,
    );
  }

  @Post(':id/authorize') @Permissions('billing.write')
  authorize(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'AUTHORIZE', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/attachments')
  @Permissions('billing.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  stageAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StageDhaWorkflowAttachmentDto,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('DHA attachment file is required');
    return this.workflows.stageAttachment({
      workflowId: id,
      documentType: dto.documentType,
      interventionCode: dto.interventionCode,
      file,
    });
  }

  @Post(':id/visit') @Permissions('billing.write')
  visit(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'VISIT', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/interventions') @Permissions('billing.write')
  intervention(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'INTERVENTION', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/diagnoses') @Permissions('billing.write')
  diagnosis(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'DIAGNOSIS', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/items') @Permissions('billing.write')
  item(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'BILLABLE_ITEM', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/preview') @Permissions('billing.write')
  preview(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'PREVIEW', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/submit') @Permissions('billing.write')
  submit(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'SUBMIT', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/discharge') @Permissions('billing.write')
  discharge(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'DISCHARGE', dto.payload, dto.idempotencyKey, user.userId);
  }

  @Post(':id/close') @Permissions('billing.write')
  close(@Param('id', ParseIntPipe) id: number, @Body() dto: DhaWorkflowActionDto, @CurrentUser() user: RequestUser) {
    return this.workflows.queueAction(id, 'CLOSE', dto.payload, dto.idempotencyKey, user.userId);
  }
}
