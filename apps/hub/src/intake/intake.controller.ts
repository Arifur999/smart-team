import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { INTAKE_TEMPLATES } from '@smart-team/shared';
import { getEnv } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssetsService, type StoredUpload } from './assets.service.js';
import { AddLinkAssetDto, AddPathAssetDto, IntakeAnswerDto, UploadFieldDto } from './dto/intake.dto.js';
import { IntakeService } from './intake.service.js';

/** The brief chat for one task: Friday's questions, your answers and the files you attach. */
@Controller('tasks/:id/intake')
export class IntakeController {
  constructor(
    private readonly intake: IntakeService,
    private readonly assets: AssetsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  view(@Param('id', ParseUUIDPipe) id: string) {
    return this.intake.view(id);
  }

  @Post('messages')
  @HttpCode(202)
  async answer(@Param('id', ParseUUIDPipe) id: string, @Body() body: IntakeAnswerDto) {
    await this.intake.answer(id, body.text);
  }

  @Post('confirm')
  @HttpCode(202)
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    await this.intake.confirm(id);
  }

  @Post('assets/upload')
  @UseInterceptors(FileInterceptor('file', { dest: getEnv().UPLOAD_DIR, limits: { fileSize: getEnv().MAX_UPLOAD_MB * 1024 * 1024 } }))
  async upload(@Param('id', ParseUUIDPipe) id: string, @Body() body: UploadFieldDto, @UploadedFile() file: StoredUpload | undefined) {
    if (!file) throw new BadRequestException('No file was sent.');
    const tag = await this.tagOf(id, body.fieldId);
    const asset = await this.assets.addUpload(id, body.fieldId, tag, file);
    await this.intake.fileAdded(id, body.fieldId, asset.name);
    return asset;
  }

  @Post('assets/path')
  async addPath(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddPathAssetDto) {
    const asset = await this.assets.addPath(id, body.fieldId, await this.tagOf(id, body.fieldId), body.deviceId, body.path);
    await this.intake.fileAdded(id, body.fieldId, asset.name);
    return asset;
  }

  @Post('assets/link')
  async addLink(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddLinkAssetDto) {
    const asset = await this.assets.addLink(id, body.fieldId, await this.tagOf(id, body.fieldId), body.url);
    await this.intake.fileAdded(id, body.fieldId, asset.name);
    return asset;
  }

  @Delete('assets/:assetId')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Param('assetId', ParseUUIDPipe) assetId: string) {
    await this.assets.remove(id, assetId);
  }

  /** The field must be in the task's template; its tag goes on the file. */
  private async tagOf(taskId: string, fieldId: string): Promise<string | null> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { team: true } });
    if (!task) throw new NotFoundException('Task not found');
    const field = INTAKE_TEMPLATES[task.team].find((f) => f.id === fieldId);
    if (!field) throw new BadRequestException('That question is not part of this team’s brief.');
    return field.tag ?? null;
  }
}
