import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AgentTokenGuard } from './agent-token.guard.js';
import { SkillsService } from './skills.service.js';

const NAME = /^[a-z0-9][a-z0-9._-]{0,80}$/i;
const VERSION = /^[a-f0-9]{12}$/;

@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  /** Each role's skills, for the dashboard. Re-reads the folders so edits show up without a restart. */
  @Get('roles')
  roles() {
    this.skills.reload();
    return this.skills.roleSkills();
  }

  /** The files of one skill version, for agents to cache. */
  @Get(':name/bundle')
  @UseGuards(AgentTokenGuard)
  bundle(@Param('name') name: string, @Query('version') version: string) {
    if (!NAME.test(name) || !VERSION.test(version ?? '')) throw new BadRequestException('Invalid skill name or version');
    return this.skills.bundle(name, version);
  }
}
