import {
  LOG_KINDS,
  MAX_LOG_TEXT,
  type FinishedRunStatus,
  type LogEntry,
  type LogKind,
  type RunFinishedPayload,
  type RunLogPayload,
} from '@smart-team/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const FINISHED: FinishedRunStatus[] = ['SUCCEEDED', 'FAILED', 'CANCELLED'];

export class LogEntryDto implements LogEntry {
  @IsInt()
  @Min(0)
  seq!: number;

  @IsIn(LOG_KINDS)
  kind!: LogKind;

  @IsString()
  @MaxLength(MAX_LOG_TEXT + 100)
  text!: string;

  @IsISO8601()
  at!: string;
}

export class RunLogDto implements RunLogPayload {
  @IsUUID()
  runId!: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LogEntryDto)
  entries!: LogEntryDto[];
}

export class RunFinishedDto implements RunFinishedPayload {
  @IsUUID()
  runId!: string;

  @IsIn(FINISHED)
  status!: FinishedRunStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  outcome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  costUsd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;
}
