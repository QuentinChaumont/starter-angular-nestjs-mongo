import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  trace?: string;
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(private readonly requestContext: RequestContextService) {
    super();
  }

  override log(message: string, context?: string): void {
    this.write('log', message, context);
  }

  override debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  override warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  override verbose(message: string, context?: string): void {
    this.write('verbose', message, context);
  }

  override error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    trace?: string,
  ): void {
    const entry: StructuredLogEntry = {
      level,
      message,
      ...(context ?? this.context ? { context: context ?? this.context } : {}),
      ...(this.requestContext.requestId
        ? { requestId: this.requestContext.requestId }
        : {}),
      ...(trace ? { trace } : {}),
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
