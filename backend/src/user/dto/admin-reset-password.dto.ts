import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  newPassword: string;
}
