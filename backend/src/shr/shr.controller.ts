import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ShrService } from './shr.service';

@Controller('api/v1/shr')
export class ShrController {
  constructor(private readonly shrService: ShrService) {}

  @Get('metrics')
  async getMetrics() {
    return this.shrService.getMetrics();
  }

  @Get('publications/:id')
  async getPublication(@Param('id') id: string) {
    return this.shrService.getPublicationById(Number(id));
  }
}
