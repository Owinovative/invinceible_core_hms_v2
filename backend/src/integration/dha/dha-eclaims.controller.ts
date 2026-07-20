import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { Permissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DhaEclaimsService } from './dha-eclaims.service';
import {
  AddDhaClaimLineDto,
  AddDhaDiagnosisDto,
  CreateDhaEmergencyClaimDto,
  CreateDhaPreauthorizationDto,
  DhaAttachmentMetadataDto,
  StartDhaVisitDto,
  SubmitLocalShaClaimDto,
} from './dto/eclaims-requests.dto';

interface UploadedAttachment {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller('integrations/dha/eclaims')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DhaEclaimsController {
  constructor(private readonly eclaims: DhaEclaimsService) {}

  @Post('visits')
  @Permissions('billing.write')
  startVisit(@Body() dto: StartDhaVisitDto, @CurrentUser() user: RequestUser) {
    return this.eclaims.startVisit(dto, user);
  }

  @Post('claim-lines')
  @Permissions('billing.write')
  addClaimLine(
    @Body() dto: AddDhaClaimLineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.addClaimLine(dto, user);
  }

  @Post('diagnoses')
  @Permissions('billing.write')
  addDiagnosis(
    @Body() dto: AddDhaDiagnosisDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.addDiagnosis(dto, user);
  }

  @Post('preauthorizations')
  @Permissions('billing.write')
  createPreauthorization(
    @Body() dto: CreateDhaPreauthorizationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.createPreauthorization(dto, user);
  }

  @Post('attachments')
  @Permissions('billing.write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    }),
  )
  addAttachment(
    @Body() dto: DhaAttachmentMetadataDto,
    @UploadedFile() file: UploadedAttachment | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.addAttachment(dto, file, user);
  }

  @Post('emergencies')
  @Permissions('billing.write')
  createEmergency(
    @Body() dto: CreateDhaEmergencyClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.createEmergency(dto, user);
  }

  @Post('claims/:claimId/submit')
  @Permissions('billing.write')
  submitClaim(
    @Param('claimId', ParseIntPipe) claimId: number,
    @Body() dto: SubmitLocalShaClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eclaims.submitLocalClaim(claimId, dto, user);
  }
}
