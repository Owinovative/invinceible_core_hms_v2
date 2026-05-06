import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ClinicalSafetyService } from './clinical-safety.service';
import { EvaluateClinicalSafetyDto } from './dto/evaluate-clinical-safety.dto';

@Controller('clinical-safety')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClinicalSafetyController {
  constructor(private readonly clinicalSafetyService: ClinicalSafetyService) {}

  @Post('evaluate')
  @Permissions('consultation.write')
  evaluate(@Body() dto: EvaluateClinicalSafetyDto) {
    return this.clinicalSafetyService.evaluate(dto);
  }
}
