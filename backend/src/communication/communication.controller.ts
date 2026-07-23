import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  QueueBulkCommunicationDto,
  QueueCommunicationDto,
} from './dto/queue-communication.dto';
import { CommunicationService } from './communication.service';

@Controller('communications')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('communication.send')
export class CommunicationController {
  constructor(private readonly communication: CommunicationService) {}

  @Post('messages')
  queueMessage(@Body() dto: QueueCommunicationDto) {
    return this.communication.queueMessage(dto);
  }

  @Post('bulk')
  queueBulk(@Body() dto: QueueBulkCommunicationDto) {
    return this.communication.queueBulk(dto.messages);
  }
}
