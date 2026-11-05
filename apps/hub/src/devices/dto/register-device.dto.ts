import type { RegisterPayload, ResourceInfo, ResourceKind } from '@smart-team/shared';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class ResourceDto implements ResourceInfo {
  @IsIn(['TOOL', 'FOLDER'])
  kind!: ResourceKind;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  version?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags!: string[];
}

export class RegisterDeviceDto implements RegisterPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsString()
  @MaxLength(120)
  hostname!: string;

  @IsString()
  @MaxLength(40)
  platform!: string;

  @IsString()
  @MaxLength(40)
  agentVersion!: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources!: ResourceDto[];
}
