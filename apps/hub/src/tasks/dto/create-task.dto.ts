import { TEAM_IDS, type CreateTaskInput, type LineDirection, type LineSettings, type TeamId } from '@smart-team/shared';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

/** Your choices for a task's production line; anything left out keeps the line's default. */
export class LineSettingsDto implements Partial<LineSettings> {
  @IsOptional()
  @IsIn(['match', 'concept'])
  direction?: LineDirection;

  @IsOptional()
  @IsBoolean()
  trust?: boolean;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(100)
  passMark?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  maxFixes?: number;

  @IsOptional()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skipStages?: string[];

  @IsOptional()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  extraChecks?: string[];
}

export class CreateTaskDto implements CreateTaskInput {
  @IsIn(TEAM_IDS)
  team!: TeamId;

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

  @IsOptional()
  @ValidateNested()
  @Type(() => LineSettingsDto)
  lineSettings?: LineSettingsDto;
}
