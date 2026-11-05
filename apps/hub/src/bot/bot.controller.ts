import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BotService } from './bot.service.js';
import { AnswerActionDto, SendBotMessageDto } from './dto/bot.dto.js';

@Controller('bot')
export class BotController {
  constructor(private readonly bot: BotService) {}

  @Get('status')
  status() {
    return this.bot.status();
  }

  @Get('messages')
  messages() {
    return this.bot.messages();
  }

  /** Sends a message and waits for the bot's reply. */
  @Post('messages')
  send(@Body() body: SendBotMessageDto) {
    return this.bot.send(body);
  }

  @Post('messages/:id/actions/:actionId')
  answer(@Param('id', ParseUUIDPipe) id: string, @Param('actionId', ParseUUIDPipe) actionId: string, @Body() body: AnswerActionDto) {
    return this.bot.answer(id, actionId, body.confirm);
  }
}
