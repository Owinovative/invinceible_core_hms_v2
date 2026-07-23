import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
export class QueueCommunicationDto {
  @IsIn(['sms', 'whatsapp'])
  channel: 'sms' | 'whatsapp';

  @IsString()
  recipient: string;

  @IsString()
  templateKey: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;
}

export class QueueBulkCommunicationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => QueueCommunicationDto)
  messages: QueueCommunicationDto[];
}
