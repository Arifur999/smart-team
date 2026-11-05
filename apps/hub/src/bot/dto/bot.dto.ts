import { TEAM_IDS, type BotSendInput, type TeamId } from '@smart-team/shared';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendBotMessageDto implements BotSendInput {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  text!: string;

  @IsOptional()
  @IsIn(TEAM_IDS)
  team?: TeamId | null;
}

export class AnswerActionDto {
  @IsBoolean()
  confirm!: boolean;
}
