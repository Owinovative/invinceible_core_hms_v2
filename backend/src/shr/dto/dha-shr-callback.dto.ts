import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DhaShrCallbackDto {
  @IsString()
  @IsIn(['ACCEPTED', 'SUCCESS', 'REJECTED', 'FAILED'])
  status!: 'ACCEPTED' | 'SUCCESS' | 'REJECTED' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
