import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class ReplyFeedbackDto {
  @IsString()
  @MinLength(2)
  replyText: string;

  @IsOptional()
  @IsIn(['OPEN', 'REPLIED', 'CLOSED'])
  statusCode?: string;
}
