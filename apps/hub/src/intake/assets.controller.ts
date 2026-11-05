import { createReadStream } from 'node:fs';
import { Controller, Get, Param, ParseUUIDPipe, StreamableFile, UseGuards } from '@nestjs/common';
import { AgentTokenGuard } from '../skills/agent-token.guard.js';
import { AssetsService } from './assets.service.js';

/** Agents download uploaded brief files from here before a run. */
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get(':id/file')
  @UseGuards(AgentTokenGuard)
  async file(@Param('id', ParseUUIDPipe) id: string) {
    const file = await this.assets.uploadFile(id);
    return new StreamableFile(createReadStream(file.path), {
      type: file.mime ?? 'application/octet-stream',
      length: file.size,
      disposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
    });
  }
}
