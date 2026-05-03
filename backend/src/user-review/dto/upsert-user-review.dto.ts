import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertUserReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(1200)
  comment: string;
}
