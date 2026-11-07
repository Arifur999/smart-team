import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Writes every refused or failed API request to the hub log (method, path, status, message), then answers as
 * Nest normally would. Without it a button that "does nothing" leaves no trace: Nest only logs 500s.
 */
@Catch()
export class HttpErrorLogFilter extends BaseExceptionFilter {
  private readonly log = new Logger('HTTP');

  override catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<{ method?: string; url?: string }>();
      const status = exception instanceof HttpException ? exception.getStatus() : 500;
      // The agents' heartbeats and missing favicons are noise; everything else a person or agent did is worth a line.
      if (status !== 404 || !/favicon/.test(req.url ?? '')) {
        const message = exception instanceof HttpException ? JSON.stringify(exception.getResponse()) : String((exception as Error)?.message ?? exception);
        const line = `${req.method} ${req.url} -> ${status} ${message.slice(0, 300)}`;
        if (status >= 500) this.log.error(line);
        else this.log.warn(line);
      }
    }
    super.catch(exception, host);
  }
}
