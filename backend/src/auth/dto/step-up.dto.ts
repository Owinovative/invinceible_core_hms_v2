import { IsString, MaxLength, MinLength } from 'class-validator';

export class StepUpDto {
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password: string;
}
