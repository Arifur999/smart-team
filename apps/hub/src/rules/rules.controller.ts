import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { RuleBookView } from '@smart-team/shared';
import { RulesService } from './rules.service.js';

/** House rules for the dashboard: what every team follows, and Nick Fury's proposals waiting for you. */
@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  books(): Promise<RuleBookView[]> {
    return this.rules.books();
  }

  @Post('proposals/:id/apply')
  async apply(@Param('id', ParseUUIDPipe) id: string): Promise<{ ruleId: string }> {
    return { ruleId: await this.rules.apply(id) };
  }

  @Post('proposals/:id/dismiss')
  @HttpCode(204)
  async dismiss(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rules.dismiss(id);
  }
}
