import { BadRequestException, Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { getEnv } from '../env.js';
import type { StoredUpload } from '../intake/assets.service.js';
import { AgentTokenGuard } from '../skills/agent-token.guard.js';
import { DeliverablesService } from './deliverables.service.js';

/** The one part of Express's response the file route uses: sendFile handles Range, ETag and caching. */
interface FileResponse {
  sendFile(path: string, options: Record<string, unknown>): void;
}

/** Header an agent sends with uploads, naming its PC (the hub checks the run is that PC's). */
export const DEVICE_ID_HEADER = 'x-device-id';

class DeliverableUploadDto {
  @IsString()
  @MaxLength(500)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}

/** Agents upload a line stage's files here while the stage's run is still going. */
@Controller('runs/:runId/deliverables')
export class AgentDeliverablesController {
  constructor(private readonly deliverables: DeliverablesService) {}

  @Post()
  @UseGuards(AgentTokenGuard)
  @UseInterceptors(FileInterceptor('file', { dest: getEnv().DELIVERABLES_DIR, limits: { fileSize: getEnv().MAX_DELIVERABLE_MB * 1024 * 1024, files: 1 } }))
  async upload(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Headers(DEVICE_ID_HEADER) deviceId: string | undefined,
    @Body() body: DeliverableUploadDto,
    @UploadedFile() file: StoredUpload | undefined,
  ) {
    if (!file) throw new BadRequestException('No file was sent.');
    return this.deliverables.addFromAgent(runId, deviceId, body.path, body.label, file);
  }
}

/** The dashboard plays and shows stage files from here; seeking works (HTTP Range). LAN only, like the rest of the hub. */
@Controller()
export class DeliverablesController {
  constructor(private readonly deliverables: DeliverablesService) {}

  @Get('deliverables/:id/file')
  async file(@Param('id', ParseUUIDPipe) id: string, @Query('download') download: string | undefined, @Res() res: FileResponse) {
    const file = await this.deliverables.file(id);
    const disposition = file.inline && download !== '1' ? 'inline' : 'attachment';
    res.sendFile(file.path, {
      acceptRanges: true,
      maxAge: '365d',
      immutable: true,
      headers: {
        'Content-Type': file.mime,
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  }

  @Get('tasks/:id/versions')
  versions(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliverables.versions(id);
  }
}
