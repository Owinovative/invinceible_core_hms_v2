import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DhaCallbackAuthGuard } from './dha-callback-auth.guard';
import { DhaService } from './dha.service';

class DhaClaimStatusCallbackDto {
  @IsOptional()
  request?: { reference?: string };

  @IsOptional()
  @IsString()
  @MaxLength(160)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  claimNumber?: string;

  @IsOptional()
  extension?: Array<Record<string, unknown>>;
}

@Controller('integrations/dha/callbacks')
@UseGuards(DhaCallbackAuthGuard)
export class DhaCallbackController {
  constructor(private readonly dhaService: DhaService) {}

  @Post('claim-status')
  async claimStatus(@Body() payload: DhaClaimStatusCallbackDto) {
    const claimNumber =
      payload.claimNumber ||
      payload.request?.reference?.split('/')?.at(-1) ||
      payload.id;
    const claimStateExtension = payload.extension?.find((extension) =>
      typeof extension.url === 'string'
        ? extension.url.toLowerCase().includes('claim-state')
        : false,
    );
    const status =
      payload.status ||
      payload.outcome ||
      (typeof claimStateExtension?.valueString === 'string'
        ? claimStateExtension.valueString
        : typeof claimStateExtension?.valueCode === 'string'
          ? claimStateExtension.valueCode
          : undefined);

    if (claimNumber && status) {
      await this.dhaService.handleClaimStatusCallback({ claimNumber, status });
    }
    return { received: true };
  }
}
