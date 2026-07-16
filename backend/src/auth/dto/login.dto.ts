import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class LoginDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
