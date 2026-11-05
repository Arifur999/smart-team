import type { AddLinkAssetInput, AddPathAssetInput, IntakeAnswerInput } from '@smart-team/shared';
import { IsString, IsUrl, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const FIELD_ID = /^[a-z][a-z0-9_-]{0,40}$/;

export class IntakeAnswerDto implements IntakeAnswerInput {
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  text!: string;
}

export class AddPathAssetDto implements AddPathAssetInput {
  @Matches(FIELD_ID)
  fieldId!: string;

  @IsUUID()
  deviceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  path!: string;
}

export class AddLinkAssetDto implements AddLinkAssetInput {
  @Matches(FIELD_ID)
  fieldId!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2_000)
  url!: string;
}

export class UploadFieldDto {
  @Matches(FIELD_ID)
  fieldId!: string;
}
