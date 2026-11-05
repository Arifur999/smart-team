import type { CreateTaskInput } from '@smart-team/shared';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTaskDto implements CreateTaskInput {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  prompt!: string;

  @IsUUID()
  deviceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  workDir!: string;
}
