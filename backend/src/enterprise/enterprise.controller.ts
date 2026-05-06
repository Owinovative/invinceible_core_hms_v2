import { Controller, Get } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get('status')
  getStatus() {
    return this.enterpriseService.getStatus();
  }
}
