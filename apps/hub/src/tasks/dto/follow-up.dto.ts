import type { FollowUpInput } from '@smart-team/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FollowUpDto implements FollowUpInput {
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  prompt!: string;
}
