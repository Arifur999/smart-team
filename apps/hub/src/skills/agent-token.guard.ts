import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AGENT_TOKEN_HEADER } from '@smart-team/shared';
import { getEnv } from '../env.js';
import { tokensMatch } from '../orchestration/socket-auth.js';

/** HTTP routes only agents may call carry the shared agent token in a header. */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    if (!tokensMatch(request.headers[AGENT_TOKEN_HEADER], getEnv().AGENT_TOKEN)) throw new UnauthorizedException();
    return true;
  }
}
