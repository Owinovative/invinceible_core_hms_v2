import { IsString, MaxLength } from 'class-validator';

export class UpdateBedStatusDto {
  @IsString()
  @MaxLength(50)
  statusCode: string;
}
