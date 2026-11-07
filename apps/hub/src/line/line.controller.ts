import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { SendBackInput } from '@smart-team/shared';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { LineSettingsDto } from '../tasks/dto/create-task.dto.js';
import { TasksService } from '../tasks/tasks.service.js';
import { LineService } from './line.service.js';

class NoteItemDto {
  @IsString()
  @MaxLength(2_000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  scene?: string;
}

class SendBackDto implements SendBackInput {
  @IsString()
  @MaxLength(8_000)
  notes!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  items?: NoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  stage?: string;
}

class CommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  comment?: string;
}

class RetryDto {
  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  instruction?: string;
}

/** Every production line with its tasks and stage stats, for the board. */
@Controller('lines')
export class LinesController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list() {
    return this.tasks.lines();
  }
}

/** What you do on a task's production line: approve, send back with notes, retry or skip a stopped stage, change settings. */
@Controller('tasks/:id/line')
export class LineController {
  constructor(private readonly lines: LineService) {}

  @Post('approve')
  @HttpCode(202)
  async approve(@Param('id', ParseUUIDPipe) id: string, @Body() body: CommentDto) {
    await this.lines.approve(id, body.comment);
  }

  @Post('send-back')
  @HttpCode(202)
  async sendBack(@Param('id', ParseUUIDPipe) id: string, @Body() body: SendBackDto) {
    await this.lines.sendBack(id, body);
  }

  @Post('retry')
  @HttpCode(202)
  async retry(@Param('id', ParseUUIDPipe) id: string, @Body() body: RetryDto) {
    await this.lines.retry(id, body.instruction);
  }

  @Post('skip')
  @HttpCode(202)
  async skip(@Param('id', ParseUUIDPipe) id: string) {
    await this.lines.skip(id);
  }

  @Patch('settings')
  @HttpCode(202)
  async settings(@Param('id', ParseUUIDPipe) id: string, @Body() body: LineSettingsDto) {
    await this.lines.updateSettings(id, body);
  }
}
